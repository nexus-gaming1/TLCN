# Hướng dẫn sử dụng API Client trong Nexus Control

Tài liệu này dành cho lập trình viên phát triển ứng dụng Windows Forms
`NexusControl`. API client nằm tại
[`NexusControl/NexusControl/Services/ApiClient.cs`](../NexusControl/NexusControl/Services/ApiClient.cs)
và dùng để gọi backend qua HTTP.

## 1. Cấu hình địa chỉ backend

`ApiClient` lấy địa chỉ cơ sở theo thứ tự:

1. Giá trị truyền vào constructor `new ApiClient(baseUrl)`.
2. Biến môi trường `NEXUS_API_URL`.
3. Giá trị mặc định `http://localhost:3001/api`.

Giá trị `BaseUrl` được tự động bỏ dấu `/` ở cuối. Vì vậy, với backend chạy
local, không cần thêm `/` sau `api`:

```text
http://localhost:3001/api
```

Có thể đổi địa chỉ dùng chung trong lúc chạy:

```csharp
ApiClient.Instance.BaseUrl = "http://192.168.1.20:3001/api";
```

Không đặt mật khẩu, JWT hoặc thông tin nhạy cảm trong URL.

## 2. Gọi API cơ bản

`ApiClient` hỗ trợ các phương thức generic:

```csharp
Task<ApiResponse<T>> GetAsync<T>(string endpoint, CancellationToken cancellationToken = default)
Task<ApiResponse<T>> PostAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
Task<ApiResponse<T>> PutAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
Task<ApiResponse<T>> PatchAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
Task<ApiResponse<T>> DeleteAsync<T>(string endpoint, CancellationToken cancellationToken = default)
```

Endpoint tương đối được nối vào `BaseUrl`:

```csharp
var response = await ApiClient.Instance.GetAsync<DashboardData>(
    "/dashboard/overview",
    cancellationToken);
```

Endpoint tuyệt đối bắt đầu bằng `http://` hoặc `https://` được sử dụng
nguyên trạng. Nên dùng endpoint tương đối cho API của Nexus để giữ cấu hình
base URL tập trung.

### Gửi body JSON

Body được tự động serialize thành JSON với `System.Text.Json` và header
`Content-Type: application/json`:

```csharp
var request = new UpdateComputerRequest
{
    Name = "PC-01",
    Status = "AVAILABLE"
};

ApiResponse<ComputerDto> response =
    await ApiClient.Instance.PutAsync<ComputerDto>(
        "/computers/1",
        request,
        cancellationToken);
```

Không tự serialize body trước khi truyền vào `PostAsync`, `PutAsync` hoặc
`PatchAsync`.

## 3. Xác thực và phiên đăng nhập

Khi `UserSessionService.AccessToken` có giá trị, `ApiClient` tự động thêm:

```http
Authorization: Bearer <access-token>
```

Không tự thêm header này ở từng màn hình. Hãy lưu phiên thông qua
`UserSessionService` để mọi request dùng chung hoạt động nhất quán.

### Đăng nhập Nexus Control

Nên gọi `AuthService` thay vì gọi `ApiClient` trực tiếp:

```csharp
var result = await AuthService.Instance.LoginAsync(
    username,
    password,
    cancellationToken);

if (result.IsSuccess)
{
    // LoginAsync đã lưu token và user vào UserSessionService.
}
else
{
    MessageBox.Show(result.Message ?? "Đăng nhập thất bại.");
}
```

Request thực tế:

```http
POST /api/auth/control-login
Content-Type: application/json

{
  "username": "admin",
  "password": "••••••••"
}
```

Backend chỉ cho phép tài khoản có role khác `MEMBER` và trạng thái hoạt động
(`ACTIVE`) đăng nhập Nexus Control.

### Lấy người dùng hiện tại

```csharp
var result = await AuthService.Instance.GetCurrentUserProfileAsync(
    cancellationToken);

if (result.IsSuccess && result.Data is not null)
{
    UserDto user = result.Data;
    // user.UserId, user.Username, user.FullName, user.Role, user.Status
}
```

`AuthService.GetCurrentUserProfileAsync` sẽ cập nhật user trong session khi
request thành công. Nếu chưa đăng nhập, phương thức trả về `ApiResponse` lỗi
và không gọi backend.

### Đăng xuất

```csharp
AuthService.Instance.Logout();
```

Đăng xuất hiện tại xóa token, refresh token và user trong bộ nhớ ứng dụng.
Backend không có endpoint logout riêng.

## 4. Đọc kết quả và xử lý lỗi

Mọi lời gọi nên kiểm tra `IsSuccess` trước khi sử dụng `Data`:

```csharp
ApiResponse<MyDto> result =
    await ApiClient.Instance.GetAsync<MyDto>("/some-endpoint", cancellationToken);

if (!result.IsSuccess)
{
    string message = result.Message ?? "Yêu cầu API thất bại.";
    MessageBox.Show(message, "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
    return;
}

MyDto? data = result.Data;
```

`ApiResponse<T>` có các trường:

| Trường | Ý nghĩa |
|---|---|
| `Status` | `"success"` hoặc `"error"` |
| `Message` | Thông báo từ backend hoặc client |
| `Data` | Dữ liệu đã deserialize theo kiểu `T` |
| `IsSuccess` | true khi `Status` bằng `"success"` không phân biệt hoa thường |

Các tình huống được `ApiClient` xử lý:

- HTTP thành công: deserialize envelope `ApiResponse<T>`.
- Backend trả object trực tiếp: thử deserialize object đó thành `T`.
- HTTP `401 Unauthorized`: xóa session hiện tại nếu đang đăng nhập.
- Không kết nối được: trả lỗi kết nối kèm `BaseUrl`.
- Timeout: trả lỗi timeout; timeout mặc định là 15 giây.
- Lỗi khác: trả thông báo lỗi trong `ApiResponse<T>`.

Không nên bắt `Exception` rồi bỏ qua lỗi. Hãy hiển thị hoặc ghi log
`result.Message` theo quy ước của màn hình.

## 5. Hủy request và timeout

Truyền `CancellationToken` từ thao tác UI hoặc lifecycle của form:

```csharp
using var cts = new CancellationTokenSource();

try
{
    var result = await ApiClient.Instance.GetAsync<MyDto>(
        "/resource",
        cts.Token);
}
catch (OperationCanceledException)
{
    // Chỉ xử lý nếu màn hình cần phân biệt thao tác hủy với lỗi API.
}
```

`HttpClient` của client có timeout 15 giây. Không tạo `HttpClient` mới cho
mỗi click hoặc mỗi request.

## 6. Tạo service cho nghiệp vụ mới

Tách contract nghiệp vụ khỏi form, theo mẫu của
[`AuthService.cs`](../NexusControl/NexusControl/Services/AuthService.cs):

```csharp
public sealed class ComputerService
{
    private readonly ApiClient _apiClient;

    public ComputerService(ApiClient? apiClient = null)
    {
        _apiClient = apiClient ?? ApiClient.Instance;
    }

    public Task<ApiResponse<List<ComputerDto>>> GetComputersAsync(
        CancellationToken cancellationToken = default)
    {
        return _apiClient.GetAsync<List<ComputerDto>>(
            "/computers",
            cancellationToken);
    }
}
```

Form chỉ nên gọi service, kiểm tra `IsSuccess` và cập nhật giao diện. Không
đặt URL, serialize JSON hoặc xử lý JWT trực tiếp trong form.

## 7. Kiểm thử

Constructor hỗ trợ truyền `HttpClient` và `baseUrl`, vì vậy có thể dùng
`HttpMessageHandler` giả trong unit test:

```csharp
var handler = new StubHttpMessageHandler();
using var httpClient = new HttpClient(handler);
var client = new ApiClient("https://test.example/api", httpClient);

ApiResponse<TestDto> result =
    await client.GetAsync<TestDto>("/resource");
```

Nên kiểm tra ít nhất:

- URL được ghép đúng với endpoint có và không có dấu `/`.
- Body JSON và `Content-Type`.
- Header Bearer khi session có token.
- Deserialize response thành công và response lỗi.
- `401` xóa session.
- timeout và lỗi không kết nối được.

## 8. Checklist khi thêm API mới

- [ ] Xác định HTTP method và endpoint từ backend.
- [ ] Tạo DTO có `[JsonPropertyName]` khi tên JSON không theo PascalCase.
- [ ] Chọn kiểu `T` đúng với trường `data` của response.
- [ ] Gọi qua service, không gọi trực tiếp từ form nếu có nghiệp vụ.
- [ ] Truyền `CancellationToken`.
- [ ] Kiểm tra `IsSuccess` trước `Data`.
- [ ] Không tự thêm Bearer token.
- [ ] Không ghi token hoặc password vào log.
- [ ] Thêm test cho request và response quan trọng.
