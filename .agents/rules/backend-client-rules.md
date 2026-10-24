# Rule: Backend & NetClient Architectural Invariants

Whenever implementing or modifying features involving the communication between **Backend (Node.js)** and **Client (C# .NET - NetClient)**:

## 1. Absolute Invariants (Never Violate)
1. **Never query database with `machineId`**: In `backend/src/sockets/machineSocket.js` and services, NEVER query the `computer` table using `machineId` or `hostname`. Always resolve the computer record using `findComputer(machine)` via `ip_address` (localIp) and `mac_address`.
2. **Never modify existing DB Models/Schemas**: Do NOT modify or drop existing tables/models in `backend/src/models/`. Reuse existing models (`Computer`, `ComputerStatusLog`, `User`, `Member`, `ComboTime`).
3. **Mandatory Audit Logging**: Any machine status change (`ONLINE`, `IN_USE`, `LOCKED`, `OFFLINE`) MUST invoke `recordStatusChange(computer, previousStatus, newStatus, memberId, transaction)`.
4. **WinForms UI Thread Safety**: In `NetClient.UI` and `NetClientApp`, NEVER access WinForms controls directly from IPC callbacks or background threads. Always wrap in `if (InvokeRequired) { BeginInvoke(...); return; }`.
5. **IPC Pipe Thread Safety**: In `IpcServerService.cs` and `IpcClientService.cs`, always synchronize pipe writes using `SemaphoreSlim` (`_sendLock`).
6. **Windows Batch Scripts (.bat)**: NEVER use accented Vietnamese characters in `.bat` files to prevent encoding errors on Windows terminals. Always use pure unaccented Vietnamese or English.

## 2. Reference Documentation
- Comprehensive Guide: `docs/QUY_TRINH_TUONG_TAC_BACKEND_CLIENT.md`
- Developer Quickstart / Cheatsheet: `docs/QUICKSTART_TUONG_TAC_BACKEND_CLIENT.md`
- Detailed AI Agent Protocol: `docs/AI_AGENT_BACKEND_CLIENT_GUIDELINES.md`
