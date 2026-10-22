const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
// Kéo toàn bộ cấu hình Database và Models vào đây
const db = require('./src/models');
// Import migration runner & seeder
const runMigrations = require('./src/utils/migrationRunner');
const seedData = require('./src/utils/seeder');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const computerRoutes = require('./src/routes/computerRoutes');
const pricingPlanRoutes = require('./src/routes/pricingPlanRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const { initSocket } = require('./src/sockets');
const healthRoutes = require('./src/routes/healthRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const serviceCatalogRoutes = require('./src/routes/serviceCatalogRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const errorHandler = require('./src/middleware/errorHandler');
const computerSocketService = require('./src/services/computerSocketService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint (dùng cho Load Balancer & Monitoring System)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to NEXUS Cloud Cyber OS API!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/computers', computerRoutes);
app.use('/api/pricing-plans', pricingPlanRoutes);
app.use('/api/promotions', pricingPlanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/catalog', serviceCatalogRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/reports', reportRoutes);

// Centralized Error Handler
app.use(errorHandler);
const server = http.createServer(app);

// Gắn Socket.IO vào HTTP Server
const io = initSocket(server)

// Khi có client kết nối
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Client ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});
computerSocketService.init(io);
// CHẠY MIGRATIONS, ĐỒNG BỘ DATABASE & BẬT SERVER
async function startServer() {
  try {
    // 1. Chạy Sequelize CLI Migrations tự động trước
    await runMigrations();

    // 2. Kết nối và đồng bộ ORM
    await db.sequelize.sync();
    console.log('✅ Kết nối & Đồng bộ CSDL MySQL thành công!');

    // 3. Chạy seeder nạp dữ liệu mẫu
    await seedData(db);

    // 4. Bật server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Lỗi khởi tạo ứng dụng Backend:', err);
  }
}

startServer();