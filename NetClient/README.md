# Hệ Thống NetClient - C# Agent Quản Lý Phòng Net (Cyber Cafe Client)

Dự án **NetClient** là ứng dụng Client Agent viết bằng C# hiện đại (.NET 10 / .NET 8) chạy trên máy trạm Windows, kết nối realtime tới Backend Node.js qua **Socket.IO**, tự động hồi phục kết nối, đo đạc hiệu năng phần cứng, thực thi các lệnh điều khiển từ xa an toàn và hiển thị màn hình khóa toàn màn hình (**LockOverlay**) khi chưa đăng nhập.

---

## 1. Kiến Trúc 2-Process (Service + UI)

Để khắc phục rào cản **Windows Session 0 Isolation** (Windows Service không thể hiển thị giao diện lên desktop của người dùng), hệ thống được chia thành 2 tiến trình độc lập:

```
[ Backend Server (Node.js) ]
            │
            │  Socket.IO (WebSocket)
            ▼
┌─────────────────────────────────────────────────────────────┐
│  NetClient.Service (Windows Service / Chạy nền)             │
│  ├── SocketService: Quản lý kết nối, tự động reconnect      │
│  ├── PerformanceMonitor: Đo CPU, RAM (Win32 API), Disk, Net │
│  ├── CommandService: Whitelist SHUTDOWN, RESTART, NOTIF...  │
│  ├── SessionService: State Machine (ONLINE, IN_USE, LOCKED) │
│  └── IpcServerService: Named Pipe Server                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │  Named Pipe IPC (Local)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  NetClient.UI (Chạy trong User Session)                     │
│  ├── IpcClientService: Kết nối và nhận lệnh từ Service      │
│  └── Forms/LockOverlay: Màn hình khóa Fullscreen, TopMost   │
│      ├── ShowOverlay() / HideOverlay()                      │
│      └── SetUsername() / SetStatus()                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục

```text
NetClient/
├── NetClient.slnx                  # Solution chứa toàn bộ các project
├── start-all.bat                   # Script khởi chạy cả Service và UI cùng lúc (phát triển/test)
├── install-service.bat             # Script cài đặt tự động toàn diện: Service + UI LockOverlay tự chạy cùng Win
├── uninstall-service.bat           # Script gỡ bỏ sạch sẽ Service và UI LockOverlay khỏi Windows
│
├── NetClient.Shared/               # Thư viện DTOs & Models dùng chung
│   ├── Models/
│   │   ├── MachineStatus.cs        # Enum: ONLINE, IN_USE, LOCKED, OFFLINE
│   │   ├── MachineInfo.cs          # Model thông tin máy
│   │   ├── PerformanceData.cs      # Model hiệu năng (CPU, RAM, GPU, Disk, Network)
│   │   └── SocketContracts.cs      # Contracts cho các event Socket.IO (ACK, Heartbeat, Register)
│   └── Ipc/
│       └── IpcMessages.cs          # Giao thức tin nhắn Named Pipe IPC
│
├── NetClient.Service/              # Background Agent
│   ├── Program.cs                  # Host DI, Windows Service config, Logging
│   ├── Services/
│   │   ├── SocketService.cs        # Socket.IO Client v4, Reconnection, Heartbeat
│   │   ├── CommandService.cs       # Whitelist lệnh an toàn (Shutdown, Restart, Notif...)
│   │   ├── PerformanceMonitor.cs   # Đo CPU (GetSystemTimes), RAM (GlobalMemoryStatusEx)
│   │   ├── SessionService.cs       # Quản lý phiên, trạng thái máy & mạng LAN
│   │   └── IpcServerService.cs     # Named Pipe Server giao tiếp với UI
│   └── Configuration/
│       └── appsettings.json        # Cấu hình Server URL, MachineId, Heartbeat Interval
│
├── NetClient.UI/                   # Giao diện màn hình khóa
│   ├── Program.cs                  # Single instance Mutex, ApplicationContext
│   ├── Forms/
│   │   ├── LockOverlay.cs          # API ShowOverlay, HideOverlay, SetUsername, SetStatus
│   │   └── LockOverlay.Designer.cs # Giao diện Dark theme phong cách Cyber Gaming
│   └── Services/
│       └── IpcClientService.cs     # Tự kết nối lại IPC Pipe và điều khiển giao diện
│
├── NetClient.Tests/                # 12 Unit & Integration Tests tự động (xUnit)
│   ├── SessionServiceTests.cs
│   ├── PerformanceMonitorTests.cs
│   ├── CommandServiceTests.cs
│   └── IpcCommunicationTests.cs
│
└── test-server/                    # Node.js Mock Socket.IO Server để kiểm thử E2E
    ├── package.json
    └── server.js
```

---

## 3. Contract Giao Tiếp Socket.IO (Client ⇄ Backend)

### A. Client → Server

1. **`register`**: Gửi ngay khi kết nối hoặc tái kết nối thành công:
   ```json
   {
     "machineId": "PC01",
     "hostname": "PC01",
     "localIp": "192.168.1.50",
     "macAddress": "D0:39:57:E4:73:DB",
     "windowsUser": "player1",
     "status": "ONLINE"
   }
   ```
2. **`heartbeat`**: Gửi định kỳ mỗi 5 giây:
   ```json
   {
     "machineId": "PC01",
     "status": "IN_USE",
     "username": "vinh",
     "timestamp": "2026-09-11T00:27:30.000Z",
     "performance": {
       "cpuUsage": 23.4,
       "ramUsage": 61.2,
       "ramUsedGb": 9.8,
       "ramTotalGb": 16.0,
       "gpuUsage": null,
       "gpuTemperature": null,
       "diskUsage": 45.2,
       "networkSentBytes": 1048576,
       "networkReceivedBytes": 5242880
     }
   }
   ```
3. **`status:update`**: Khi máy trạm chuyển trạng thái:
   ```json
   {
     "machineId": "PC01",
     "status": "IN_USE",
     "previousStatus": "ONLINE",
     "timestamp": "2026-09-11T00:27:30.000Z"
   }
   ```
4. **`login:ack`**: Phản hồi kết quả xử lý login:
   ```json
   { "machineId": "PC01", "username": "vinh", "success": true, "error": null }
   ```
5. **`logout:ack`**: Phản hồi kết quả xử lý logout:
   ```json
   { "machineId": "PC01", "success": true, "error": null }
   ```
6. **`command:ack`**: Phản hồi kết quả thực thi lệnh:
   ```json
   { "command": "SHUTDOWN", "success": true, "machineId": "PC01", "error": null }
   ```

### B. Server → Client

1. **`command`**: Gửi lệnh điều khiển (Chỉ cho phép Whitelist):
   - `SHUTDOWN`: Tắt máy an toàn (`shutdown.exe /s /t 0 /f`)
   - `RESTART`: Khởi động lại máy (`shutdown.exe /r /t 0 /f`)
   - `SHOW_NOTIFICATION`: Hiển thị thông báo `{ "command": "SHOW_NOTIFICATION", "message": "Sắp hết giờ" }`
   - `GET_STATUS`: Yêu cầu báo cáo trạng thái tức thì
2. **`session:login`**: Đăng nhập phiên người dùng:
   ```json
   { "command": "LOGIN", "username": "vinh" }
   ```
   -> Client tự động lưu username, ẩn màn hình khóa `LockOverlay`, đổi trạng thái sang `IN_USE` và gửi `login:ack`.
3. **`session:logout`**: Đăng xuất người dùng:
   ```json
   { "command": "LOGOUT" }
   ```
   -> Client xóa username, hiện lại màn hình khóa `LockOverlay`, đổi trạng thái sang `ONLINE` và gửi `logout:ack`.
4. **`notification`**: Hiển thị thông báo nổi trên màn hình.

---

## 4. Hướng Dẫn Chạy & Kiểm Thử

### Bước 1: Chạy Unit Tests tự động
Toàn bộ 12 test kiểm tra các luồng trạng thái, thu thập CPU/RAM, whitelist lệnh, và IPC Named Pipe:
```powershell
cd NetClient
dotnet test
```

### Bước 2: Kiểm thử thực tế với Mock Node.js Socket.IO Server
1. Chạy server mock:
   ```powershell
   cd NetClient/test-server
   node server.js
   ```
2. Mở một terminal khác và chạy Service:
   ```powershell
   cd NetClient
   dotnet run --project NetClient.Service/NetClient.Service.csproj
   ```
3. Xem toàn bộ 5 test E2E vượt qua thành công:
   - `register` -> PASS
   - `heartbeat` (CPU/RAM) -> PASS
   - `session:login` -> PASS
   - `command` -> PASS
   - `session:logout` -> PASS

### Bước 3: Chạy giao diện màn hình khóa (LockOverlay)
```powershell
cd NetClient
dotnet run --project NetClient.UI/NetClient.UI.csproj
```
Hoặc dùng script tiện ích chạy cả 2:
```powershell
.\start-all.bat
```

---

## 5. Cài Đặt Khởi Động Cùng Windows (Triển Khai Máy Trạm)

Chỉ cần bấm chuột phải vào `install-service.bat` và chọn **Run as administrator**. Script sẽ tự động:
1. Publish bản Release của cả `NetClient.Service` và `NetClient.UI`.
2. Đăng ký dịch vụ Windows Service `NetClientService` với chế độ `auto` (tự chạy khi bật máy).
3. Đăng ký `NetClient.UI.exe` vào Windows Startup Registry (`HKLM` & `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`) để màn hình khóa luôn tự mở khi người dùng mở máy/đăng nhập.
4. Tự động khởi chạy Service và hiển thị lớp phủ **LockOverlay** ngay lập tức trên màn hình.

### Gỡ cài đặt:
Bấm chuột phải vào `uninstall-service.bat` và chọn **Run as administrator** để tự động dừng/xóa Service, tắt UI và gỡ bỏ khóa Startup trong Registry.


