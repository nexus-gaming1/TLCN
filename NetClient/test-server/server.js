const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Enable JSON middleware & CORS
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * Machine Manager (In-Memory Store)
 * Keeps track of registered agents, active sockets, machine states, and performance stats.
 */
class MachineStore {
  constructor() {
    this.machines = new Map(); // machineId -> MachineData
    this.socketMap = new Map(); // socketId -> machineId
  }

  register(socketId, data) {
    const machineId = data.machineId;
    if (!machineId) return null;

    const existing = this.machines.get(machineId) || {};
    const updated = {
      ...existing,
      machineId: data.machineId,
      hostname: data.hostname || existing.hostname || "Unknown",
      localIp: data.localIp || existing.localIp || "127.0.0.1",
      macAddress: data.macAddress || existing.macAddress || null,
      windowsUser: data.windowsUser || existing.windowsUser || null,
      status: data.status || existing.status || "ONLINE",
      currentUser: existing.currentUser || null,
      performance: existing.performance || null,
      socketId: socketId,
      connectedAt: existing.connectedAt || new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };

    this.machines.set(machineId, updated);
    this.socketMap.set(socketId, machineId);
    return updated;
  }

  updateHeartbeat(socketId, data) {
    const machineId = data.machineId || this.socketMap.get(socketId);
    if (!machineId || !this.machines.has(machineId)) return null;

    const machine = this.machines.get(machineId);
    machine.status = data.status || machine.status;
    machine.currentUser = data.username !== undefined ? data.username : machine.currentUser;
    machine.performance = data.performance || machine.performance;
    machine.lastHeartbeat = data.timestamp || new Date().toISOString();
    machine.socketId = socketId;

    this.machines.set(machineId, machine);
    return machine;
  }

  updateStatus(machineId, status, previousStatus) {
    if (!this.machines.has(machineId)) return null;

    const machine = this.machines.get(machineId);
    machine.status = status;
    machine.lastStatusChange = new Date().toISOString();

    if (status === "ONLINE") {
      machine.currentUser = null;
    }

    this.machines.set(machineId, machine);
    return machine;
  }

  handleDisconnect(socketId) {
    const machineId = this.socketMap.get(socketId);
    this.socketMap.delete(socketId);

    if (machineId && this.machines.has(machineId)) {
      const machine = this.machines.get(machineId);
      // Only set offline if socket matches
      if (machine.socketId === socketId) {
        machine.status = "OFFLINE";
        machine.socketId = null;
        machine.disconnectedAt = new Date().toISOString();
        this.machines.set(machineId, machine);
        return { machineId, machine };
      }
    }
    return null;
  }

  get(machineId) {
    return this.machines.get(machineId);
  }

  getAll() {
    const obj = {};
    for (const [id, data] of this.machines.entries()) {
      obj[id] = data;
    }
    return obj;
  }
}

const store = new MachineStore();

// Broadcast machine updates to web admin clients
function broadcastUpdate() {
  io.emit("machines:list", store.getAll());
}

// -------------------------------------------------------------
// Socket.IO Agent Communication Handlers
// -------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[Socket.IO] New connection established: ${socket.id}`);

  // 1. Agent Registration
  socket.on("register", (data) => {
    console.log(`[Socket.IO] Register received from machine: ${data.machineId} (IP: ${data.localIp})`);
    const machine = store.register(socket.id, data);
    socket.join(`machine:${data.machineId}`);
    broadcastUpdate();
  });

  // 2. Periodic Heartbeat & Performance Metrics
  socket.on("heartbeat", (data) => {
    const machine = store.updateHeartbeat(socket.id, data);
    if (machine) {
      io.emit("machine:heartbeat", { machineId: machine.machineId, performance: machine.performance });
    }
  });

  // 3. Status Transition Update
  socket.on("status:update", (data) => {
    console.log(`[Socket.IO] Status update for ${data.machineId}: ${data.previousStatus} -> ${data.status}`);
    store.updateStatus(data.machineId, data.status, data.previousStatus);
    broadcastUpdate();
  });

  // 4. Session Login Acknowledgement
  socket.on("login:ack", (data) => {
    console.log(`[Socket.IO] Login ACK from ${data.machineId}: Success=${data.success}, User=${data.username}`);
    if (data.success && data.username) {
      const m = store.get(data.machineId);
      if (m) {
        m.status = "IN_USE";
        m.currentUser = data.username;
        broadcastUpdate();
      }
    }
  });

  // 5. Session Logout Acknowledgement
  socket.on("logout:ack", (data) => {
    console.log(`[Socket.IO] Logout ACK from ${data.machineId}: Success=${data.success}`);
    if (data.success) {
      const m = store.get(data.machineId);
      if (m) {
        m.status = "ONLINE";
        m.currentUser = null;
        broadcastUpdate();
      }
    }
  });

  // 6. Command Execution Acknowledgement
  socket.on("command:ack", (data) => {
    console.log(`[Socket.IO] Command ACK from ${data.machineId}: Command=${data.command}, Success=${data.success}`);
  });

  // Socket Disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Connection closed: ${socket.id}`);
    const disconnected = store.handleDisconnect(socket.id);
    if (disconnected) {
      console.log(`[Socket.IO] Machine marked OFFLINE: ${disconnected.machineId}`);
      broadcastUpdate();
    }
  });
});

// -------------------------------------------------------------
// REST API Endpoints for Admin Dashboard / External Services
// -------------------------------------------------------------

// List all registered machines
app.get("/api/machines", (req, res) => {
  res.json(store.getAll());
});

// Get machine details by ID
app.get("/api/machines/:machineId", (req, res) => {
  const machine = store.get(req.params.machineId);
  if (!machine) {
    return res.status(404).json({ error: "Machine not found" });
  }
  res.json(machine);
});

// Trigger user session login
app.post("/api/machines/:machineId/login", (req, res) => {
  const { machineId } = req.params;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const machine = store.get(machineId);
  if (!machine || !machine.socketId) {
    return res.status(404).json({ error: "Machine is offline or not registered" });
  }

  console.log(`[REST API] Triggering session:login for machine ${machineId} with user '${username}'`);
  io.to(`machine:${machineId}`).emit("session:login", { command: "LOGIN", username });
  res.json({ success: true, message: `Login request sent to ${machineId}` });
});

// Trigger user session logout
app.post("/api/machines/:machineId/logout", (req, res) => {
  const { machineId } = req.params;

  const machine = store.get(machineId);
  if (!machine || !machine.socketId) {
    return res.status(404).json({ error: "Machine is offline or not registered" });
  }

  console.log(`[REST API] Triggering session:logout for machine ${machineId}`);
  io.to(`machine:${machineId}`).emit("session:logout", { command: "LOGOUT" });
  res.json({ success: true, message: `Logout request sent to ${machineId}` });
});

// Send remote command to machine
app.post("/api/machines/:machineId/command", (req, res) => {
  const { machineId } = req.params;
  const { command, message } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  const machine = store.get(machineId);
  if (!machine || !machine.socketId) {
    return res.status(404).json({ error: "Machine is offline or not registered" });
  }

  console.log(`[REST API] Sending command '${command}' to machine ${machineId}`);
  io.to(`machine:${machineId}`).emit("command", { command, message });
  res.json({ success: true, message: `Command '${command}' sent to ${machineId}` });
});

// Send notification to machine
app.post("/api/machines/:machineId/notification", (req, res) => {
  const { machineId } = req.params;
  const { title, message, durationSeconds } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const machine = store.get(machineId);
  if (!machine || !machine.socketId) {
    return res.status(404).json({ error: "Machine is offline or not registered" });
  }

  io.to(`machine:${machineId}`).emit("notification", {
    title: title || "Thông báo hệ thống",
    message,
    durationSeconds: durationSeconds || 5
  });
  res.json({ success: true, message: `Notification sent to ${machineId}` });
});

// Broadcast command / notification to ALL machines
app.post("/api/commands/broadcast", (req, res) => {
  const { type, command, title, message } = req.body;

  if (type === "notification" || message) {
    io.emit("notification", {
      title: title || "Thông báo toàn hệ thống",
      message: message || "",
      durationSeconds: 5
    });
    console.log(`[REST API] Broadcasted notification to all machines`);
    return res.json({ success: true, message: "Broadcast notification sent to all machines" });
  }

  if (command) {
    io.emit("command", { command });
    console.log(`[REST API] Broadcasted command '${command}' to all machines`);
    return res.json({ success: true, message: `Broadcast command '${command}' sent to all machines` });
  }

  res.status(400).json({ error: "Invalid broadcast request parameters" });
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n=======================================================`);
  console.log(`🚀 NetClient Production Backend Server Running!`);
  console.log(`🌐 Web Admin Dashboard: http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO Gateway:    ws://localhost:${PORT}`);
  console.log(`=======================================================\n`);
});
