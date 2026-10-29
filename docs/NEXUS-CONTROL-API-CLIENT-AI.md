# Nexus Control API Client — AI Reference

## Purpose

Use this document as the implementation contract for AI-assisted changes in
the `NexusControl` desktop application. The client implementation is
[`ApiClient.cs`](../NexusControl/NexusControl/Services/ApiClient.cs); domain
authentication is in
[`AuthService.cs`](../NexusControl/NexusControl/Services/AuthService.cs).

## Non-negotiable rules

1. Use `ApiClient.Instance` or inject `ApiClient`; do not create a new
   `HttpClient` per request.
2. Use a relative endpoint beginning with `/`, for example
   `"/auth/me"`.
3. Let `ApiClient` serialize request bodies and attach the Bearer token.
4. Prefer a domain service between a WinForms form and `ApiClient`.
5. Always inspect `ApiResponse<T>.IsSuccess` before consuming `Data`.
6. Pass a `CancellationToken` through async service methods.
7. Never log or persist passwords, access tokens, or Authorization headers.
8. Do not silently convert failures into successful empty data.
9. Preserve the existing `ApiResponse<T>` envelope and DTO naming mappings.
10. If an endpoint contract is unclear, inspect the backend route/controller
    before writing the client call.

## Runtime configuration

```yaml
base_url:
  environment_variable: NEXUS_API_URL
  default: http://localhost:3001/api
  normalization: trim trailing slash
timeout_seconds: 15
serialization:
  library: System.Text.Json
  property_name_case_insensitive: true
  naming_policy: camelCase
```

`BaseUrl` can be overridden with the constructor or
`ApiClient.Instance.BaseUrl`. Absolute URLs are accepted but should not be
used for normal Nexus backend calls.

## Client interface

```csharp
GetAsync<T>(endpoint, cancellationToken) -> Task<ApiResponse<T>>
PostAsync<T>(endpoint, body?, cancellationToken) -> Task<ApiResponse<T>>
PutAsync<T>(endpoint, body?, cancellationToken) -> Task<ApiResponse<T>>
PatchAsync<T>(endpoint, body?, cancellationToken) -> Task<ApiResponse<T>>
DeleteAsync<T>(endpoint, cancellationToken) -> Task<ApiResponse<T>>
```

Request body behavior:

- `null` body means no request content.
- Non-null body is serialized as JSON.
- Content type is `application/json; charset=utf-8`.

## Authentication state machine

```text
no session
  -> AuthService.LoginAsync
  -> POST /auth/control-login
  -> success with data.token and data.user
  -> UserSessionService.SetSession(token, user)
  -> authenticated requests receive Authorization: Bearer <token>

authenticated request -> HTTP 401
  -> UserSessionService.ClearSession()

AuthService.Logout()
  -> UserSessionService.ClearSession()
```

The client does not refresh tokens. Do not invent refresh-token behavior.
`UserSessionService` has a refresh-token field, but the current login flow does
not populate it.

## Current endpoint contracts

### Control login

```yaml
operation: login
method: POST
path: /auth/control-login
authentication: none
request:
  username: string, required, trimmed by AuthService
  password: string, required
response:
  status: success
  message: string
  data:
    token: string
    tokenType: Bearer
    user:
      user_id: integer
      username: string
      full_name: string
      role: string
      status: string
      avatar_url: string|null, optional
failure:
  status: error
  data: null
  message: string
authorization_rule: role must not be MEMBER and status must be ACTIVE
```

Canonical C# call:

```csharp
var response = await AuthService.Instance.LoginAsync(
    username,
    password,
    cancellationToken);
```

Do not call `/auth/login` for Nexus Control unless the requirement explicitly
asks for the general application login flow.

### Current user

```yaml
operation: get_current_user
method: GET
path: /auth/me
authentication: Bearer access token required
response:
  status: success
  message: string
  data:
    user:
      user_id: integer
      username: string
      full_name: string
      role: string
      status: string
      avatar_url: string|null, optional
failure:
  401: missing or rejected authentication
  403: invalid or expired token
```

Canonical C# call:

```csharp
ApiResponse<UserDto> response =
    await AuthService.Instance.GetCurrentUserProfileAsync(cancellationToken);
```

## Response semantics

The envelope is:

```csharp
public class ApiResponse<T>
{
    public string Status { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public bool IsSuccess { get; }
}
```

Success is determined by `Status == "success"` (case-insensitive), not only
by the HTTP status code. On non-success HTTP responses, return
`ApiResponse<T>.Error(...)`. A successful response with an empty body is
represented as a successful response with default data.

Error mapping implemented by `ApiClient`:

| Condition | Required behavior |
|---|---|
| HTTP 401 | Clear active session, return error response |
| Other non-2xx | Use server `message`, otherwise include HTTP status |
| `HttpRequestException` | Return connection error mentioning `BaseUrl` |
| `TaskCanceledException` | Return timeout error |
| Other exception | Return API-processing error |

AI-generated UI code must show or otherwise explicitly handle the returned
error message. It must not ignore a failed response.

## DTO mapping

The DTOs use explicit JSON names:

```yaml
UserDto:
  UserId: user_id
  Username: username
  FullName: full_name
  Role: role
  Status: status
  AvatarUrl: avatar_url
```

The backend may include additional fields such as `memberProfile`; unknown
fields are ignored by the current DTO serializer configuration. Add a property
only when the feature needs it and the backend contract is verified.

## Approved service pattern

```csharp
public sealed class ResourceService
{
    private readonly ApiClient _apiClient;

    public ResourceService(ApiClient? apiClient = null)
    {
        _apiClient = apiClient ?? ApiClient.Instance;
    }

    public Task<ApiResponse<ResourceDto>> GetAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return _apiClient.GetAsync<ResourceDto>(
            $"/resources/{id}",
            cancellationToken);
    }
}
```

For create/update operations, define a request DTO instead of passing an
anonymous object when the payload is reused or has validation rules.

## Change procedure for a new endpoint

```text
1. Read backend route + controller + service.
2. Record method, path, auth requirement, role requirement, request body,
   response data shape, and error statuses.
3. Add or update DTOs with explicit JSON names.
4. Add a domain service method using ApiClient.
5. Wire the form/view to the domain service.
6. Handle IsSuccess, null Data, cancellation, and displayed errors.
7. Add a test with an injected HttpClient/HttpMessageHandler.
8. Run the smallest relevant build/test command.
```

Do not change `ApiClient` to accommodate one endpoint unless the behavior is
truly cross-cutting. Prefer fixing the DTO or domain service.

## Verification checklist for AI output

- [ ] The endpoint path is relative and has the correct `/api` base behavior.
- [ ] The HTTP verb matches the backend route.
- [ ] Authentication is neither omitted nor manually duplicated.
- [ ] Request and response JSON names match the backend.
- [ ] `ApiResponse<T>` uses the actual `data` shape.
- [ ] `IsSuccess` and nullable `Data` are handled.
- [ ] `CancellationToken` is forwarded.
- [ ] No credential or token is logged.
- [ ] Existing session behavior on HTTP 401 is preserved.
- [ ] The change is covered by the narrowest applicable test/build.
