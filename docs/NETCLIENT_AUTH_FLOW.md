# Luồng đăng nhập tài khoản thật trên NetClient

## 1. Mục tiêu

NetClient trước đây cho phép nhập username bất kỳ, sau đó tự chuyển máy sang `IN_USE` và ẩn màn hình khóa. Luồng mới chuyển sang xác thực tài khoản thật với Backend trước khi mở máy.

Luồng mới:

```text
Nhập username + password
  → UI gửi credentials qua IPC
  → NetClient.Service gọi POST /api/auth/login
  → Backend xác thực tài khoản
  → Thành công mới cập nhật session
  → Chuyển máy sang IN_USE
  → Ẩn LockOverlay
  → Gửi login:ack qua Socket.IO
```

## 2. Kiến trúc UI và Service

`NetClient.UI` và `NetClient.Service` là hai tiến trình riêng:

- **NetClient.UI**
  - Hiển thị giao diện WinForms.
  - Nhận username/password.
  - Hiển thị lỗi hoặc đóng màn hình đăng nhập.
  - Không trực tiếp gọi Backend.

- **NetClient.Service**
  - Chạy nền dưới dạng Windows Service.
  - Gọi API xác thực Backend.
  - Quản lý `SessionService`.
  - Kết nối Backend qua Socket.IO.
  - Giao tiếp với UI qua Named Pipe IPC.

Kênh giao tiếp:

```text
NetClient.UI
    ↕ Named Pipe: NetClient_Ipc_Pipe
NetClient.Service
```

## 3. Luồng đăng nhập chi tiết

### Bước 1: UI nhận thông tin đăng nhập

Người dùng nhập username và password trên `LockOverlay`.

UI kiểm tra hai trường không được rỗng. Nếu hợp lệ, UI chưa tự chuyển trạng thái máy và chưa ẩn overlay. UI chỉ phát yêu cầu:

```csharp
OnLoginRequested?.Invoke(username, password);
```

Điều này bảo đảm UI không tự kết luận tài khoản hợp lệ.

### Bước 2: UI gửi credentials qua IPC

`Program.cs` nối event của form với `IpcClientService`:

```csharp
overlay.OnLoginRequested += async (username, password) =>
{
    await ipcClient.SendLoginAsync(username, password);
};
```

`IpcClientService` gửi message:

```json
{
  "action": "ClientLogin",
  "username": "member01",
  "password": "123456"
}
```

`IpcClientService` chỉ chuyển dữ liệu giữa UI và Service, không gọi API Backend.

### Bước 3: Service nhận yêu cầu

`IpcServerService` đọc message từ Named Pipe. Việc xử lý được thực hiện bất đồng bộ để có thể chờ HTTP request đến Backend:

```csharp
await HandleIncomingMessageAsync(line);
```

Service kiểm tra password, sau đó phát event nội bộ:

```csharp
await LoginRequested.Invoke(msg.Username, msg.Password);
```

`IpcServerService` đóng vai trò cầu nối giữa IPC và logic xử lý login.

### Bước 4: Service gọi API Backend

`SocketService` nhận event `LoginRequested` và gọi `AuthApiService`:

```csharp
var result = await _authApiService.LoginAsync(username, password);
```

API được gọi:

```http
POST /api/auth/login
Content-Type: application/json
```

Payload:

```json
{
  "username": "member01",
  "password": "123456"
}
```

URL Backend lấy từ `Server:Url` trong `appsettings.json`, ví dụ:

```json
{
  "Server": {
    "Url": "http://192.168.1.51:3001"
  }
}
```

Endpoint hoàn chỉnh:

```text
http://192.168.1.51:3001/api/auth/login
```

### Bước 5: Backend xác thực

Backend đã có sẵn các thành phần:

- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/src/services/authService.js`

Backend kiểm tra:

- Username có tồn tại không.
- Password có đúng không.
- Bcrypt hash.
- Trạng thái tài khoản.
- Tạo JWT.

Response thành công có dạng:

```json
{
  "status": "success",
  "data": {
    "token": "...",
    "tokenType": "Bearer",
    "user": {
      "username": "member01"
    }
  },
  "message": "Đăng nhập thành công!"
}
```

### Bước 6A: Đăng nhập thất bại

Nếu API thất bại, `SocketService` gửi kết quả về UI:

```json
{
  "action": "LoginResult",
  "success": false,
  "message": "Tên đăng nhập hoặc mật khẩu không chính xác."
}
```

UI sẽ:

- Bật lại nút đăng nhập.
- Hiển thị lỗi Backend.
- Giữ nguyên `LockOverlay`.
- Cho người dùng nhập lại.
- Không gọi `SessionService.Login()`.
- Không chuyển máy sang `IN_USE`.
- Không gửi `login:ack` thành công.

### Bước 6B: Đăng nhập thành công

Sau khi API xác thực thành công, `SocketService` mới thực hiện:

```csharp
_sessionService.Login(result.Username);
await _ipcServerService.SetUsernameAsync(result.Username);
await _ipcServerService.HideOverlayAsync();
await _ipcServerService.SendLoginResultAsync(true, null);
```

`SessionService` cập nhật:

```text
CurrentUser = username
CurrentStatus = IN_USE
```

Sau đó Service gửi ACK về Backend:

```json
{
  "machineId": "PC-001",
  "username": "member01",
  "success": true
}
```

Event Socket.IO:

```text
login:ack
```

Backend dùng ACK để cập nhật `machineStore`, trạng thái máy và danh sách máy cho frontend quản trị.

## 4. Các file đã thêm hoặc sửa

### `netclient/NetClient.Shared/Ipc/IpcMessages.cs`

Đã thêm:

- `LoginResult`.
- `LegacyClientLogin` để giữ tương thích với test IPC cũ.
- Trường `Password`.
- Trường `Success`.

Lý do: IPC cần truyền username/password từ UI sang Service và kết quả xác thực từ Service về UI.

### `netclient/NetClient.UI/Services/IpcClientService.cs`

Đã thêm:

- Event `OnLoginResult`.
- Xử lý `IpcAction.LoginResult`.
- `SendLoginAsync(username, password)`.

Lý do: UI cần gửi đầy đủ credentials và nhận phản hồi thành công/thất bại từ Service.

Giữ lại overload cũ `SendLoginAsync(username, cancellationToken)` để không làm hỏng test IPC hiện có.

### `netclient/NetClient.UI/Forms/LockOverlay.cs`

Đã thay đổi:

- `OnLoginRequested` nhận cả username và password.
- Không còn tự gọi `SetUsername`, `SetStatus(IN_USE)` hoặc `HideOverlay` khi người dùng vừa bấm nút.
- Kiểm tra username/password rỗng.
- Khóa nút login trong lúc chờ kết quả.
- Thêm xử lý Enter trong ô password.
- Thêm `ShowLoginResult()`.

Lý do: chỉ được mở máy sau khi Backend xác thực thành công. Nếu xác thực thất bại, UI phải giữ màn hình khóa và hiển thị lỗi.

### `netclient/NetClient.UI/Program.cs`

Đã nối:

```csharp
overlay.OnLoginRequested
    → ipcClient.SendLoginAsync
```

và:

```csharp
ipcClient.OnLoginResult
    → overlay.ShowLoginResult
```

Lý do: `Program.cs` là nơi kết nối các thành phần UI và IPC.

### `netclient/NetClient.UI/Forms/LockOverlay.Designer.cs`

Đã đổi nội dung hướng dẫn từ chế độ thử nghiệm sang:

```text
Đăng nhập bằng tài khoản hội viên đã đăng ký
```

Lý do: giao diện không còn cho phép username bất kỳ.

### `netclient/NetClient.Service/Services/AuthApiService.cs`

Đã thêm service gọi:

```text
POST /api/auth/login
```

Service:

- Đọc `Server:Url`.
- Gửi username/password.
- Đọc response JSON.
- Trả `AuthLoginResult`.
- Trả message lỗi rõ ràng khi Backend từ chối hoặc không kết nối được.

Lý do: tách logic HTTP authentication khỏi `SocketService`, giúp code rõ ràng và dễ kiểm thử.

### `netclient/NetClient.Service/Services/IpcServerService.cs`

Đã thay đổi:

- Đọc message bất đồng bộ bằng `HandleIncomingMessageAsync`.
- Thêm event `LoginRequested`.
- Nhận username/password từ UI.
- Kiểm tra password trước khi xử lý.
- Thêm `SendLoginResultAsync`.
- Chỉ chuyển yêu cầu login sang `SocketService`, không tự login trước khi xác thực.

Lý do: đây là lớp trung gian giữa UI và Service, đồng thời cần hỗ trợ thao tác HTTP bất đồng bộ.

### `netclient/NetClient.Service/Services/SocketService.cs`

Đã thay đổi:

- Inject `AuthApiService`.
- Đăng ký `LoginRequested += AuthenticateLocalLoginAsync`.
- Thêm `AuthenticateLocalLoginAsync`.
- Gọi Backend trước khi gọi `SessionService.Login()`.
- Chỉ gửi `login:ack` sau khi xác thực thành công.
- Trả lỗi kết nối hoặc lỗi không xác định về UI.

Lý do: bảo đảm đúng thứ tự:

```text
Xác thực Backend
  → cập nhật session
  → cập nhật UI
  → gửi login:ack
```

### `netclient/NetClient.Service/Program.cs`

Đã đăng ký:

```csharp
services.AddSingleton<AuthApiService>();
```

Lý do: Dependency Injection cần biết cách tạo `AuthApiService` để inject vào `SocketService`.

## 5. So sánh trước và sau

### Trước đây

```text
Nhập username bất kỳ
  → SessionService.Login()
  → IN_USE
  → ẩn overlay
```

### Hiện tại

```text
Nhập username + password
  → gọi Backend Auth API
  → Backend kiểm tra tài khoản
  → thành công mới SessionService.Login()
  → IN_USE
  → ẩn overlay
  → login:ack
```

## 6. Kiểm tra

Đã thực hiện:

- Kiểm tra cú pháp Backend authentication: đạt.
- Build NetClient: đạt.
- Chạy NetClient tests: `12/12` đạt.

## 7. Điều kiện chạy thực tế

1. Tài khoản phải tồn tại trong database Backend.
2. Username và password phải chính xác.
3. Máy NetClient phải truy cập được `Server:Url`.
4. Backend phải đang chạy tại port đã cấu hình.
5. UI và Windows Service phải cùng sử dụng phiên bản IPC contract mới.

## 8. Lưu ý bảo mật

- Password chỉ dùng trong request xác thực và không được đưa vào `login:ack`.
- Không nên ghi password vào log.
- JWT hiện được Backend trả về nhưng NetClient chưa lưu vì các API tiếp theo của NetClient chưa yêu cầu token.
- Nếu sau này NetClient gọi các API được bảo vệ, cần lưu token trong bộ nhớ an toàn và gửi header `Authorization: Bearer <token>`.

## 9. Ghi lịch sử thay đổi trạng thái máy

Mỗi khi trạng thái máy thay đổi, Backend ghi một bản ghi vào bảng `computer_status_log`. Log chỉ được tạo khi trạng thái mới khác trạng thái trước đó, tránh ghi trùng do nhiều event cùng cập nhật một máy.

Các nguồn cập nhật được ghi log:

- API quản trị cập nhật trạng thái máy.
- NetClient đăng ký với trạng thái ban đầu.
- NetClient gửi `status:update`.
- `login:ack` chuyển máy sang `IN_USE`.
- `logout:ack` chuyển máy về `ONLINE`.
- Socket NetClient ngắt kết nối hoặc heartbeat timeout chuyển máy sang `OFFLINE`.
- Chuyển máy, Wake-on-LAN và các lệnh điều khiển đã có cơ chế ghi log trong `StationControlService`.

Mỗi log lưu:

```text
computer_id
status
session_type
recorded_at
```

Logic dùng chung nằm trong `backend/src/services/computerStatusLogService.js`. Timestamp `recorded_at` được Sequelize tự động tạo từ `createdAt`.
