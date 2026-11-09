# Báo cáo triển khai Combo và tính tiền

## 1. Kết quả đạt được

- Người dùng có thể mua và sở hữu Combo thông qua chuỗi:
  `Member.member_id -> ServiceOrder.used_by -> ComboTime.order_id`.
- Backend kiểm tra Combo còn hiệu lực, đúng Zone và đúng người sở hữu khi đăng nhập máy.
- Đã bổ sung tính tiền PAYG theo phút.
- PAYG ưu tiên trừ `bonus_balance`, sau đó mới trừ `real_balance`.
- Nếu số dư không đủ cho trọn một phút, hệ thống không trừ một phần; phiên bị từ chối hoặc kết thúc và máy được logout.
- Khi Combo hết hạn, phiên tiếp tục được tính theo PAYG.
- Không tạo `FinancialTransaction` cho từng phút; tổng tiền PAYG được lưu trong `RentalSession.total_amount`.
- Worker tự động tính phí cho các phiên đang hoạt động mỗi 10 giây.

## 2. Cách hệ thống xác nhận quyền sở hữu Combo

1. Đơn hàng Combo lưu người sử dụng tại `ServiceOrder.used_by`.
2. `ComboTime.order_id` liên kết Combo với đơn hàng.
3. Khi đăng nhập/chuyển máy/kích hoạt, backend đối chiếu `used_by` với `memberId`.
4. Chỉ Combo có trạng thái `ACTIVE`, chưa hết hạn, đơn hàng đã thanh toán và phù hợp Zone mới được sử dụng.

## 3. Các file đã thêm

- `backend/src/models/RentalSession.js`: model quản lý phiên thuê, trạng thái và chế độ tính tiền.
- `backend/src/services/billingService.js`: xử lý Combo, PAYG, Wallet, trừ tiền và kết thúc phiên.
- `backend/src/services/billingWorker.js`: quét và tính phí phiên ACTIVE định kỳ.
- `backend/src/migrations/20241024000006-create-rental-session.js`: tạo và repair bảng `rental_session`.

## 4. Các file đã sửa

- `backend/index.js`: khởi động Billing Worker.
- `backend/src/sockets/machineSocket.js`: kiểm tra quyền, số dư, tạo/đóng RentalSession và phát `session:reject`.
- `backend/src/services/authService.js`: bổ sung `member_id` vào JWT.
- `backend/src/models/ComboTime.js`, `Computer.js`, `Member.js`: bổ sung quan hệ RentalSession.
- `backend/src/utils/migrationRunner.js`: chạy repair schema khi backend khởi động.
- `NetClient/NetClient.Service/Services/SocketService.cs`: xử lý session bị từ chối.
- `NetClient/NetClient.Shared/Models/SocketContracts.cs`: bổ sung payload `SessionRejectPayload`.

## 5. Migration và database hiện tại

Migration có tính idempotent:

- Tạo bảng nếu chưa tồn tại.
- Nâng cấp bảng legacy có `session_id` thành `rental_session_id`.
- Khôi phục khóa chính `BIGINT AUTO_INCREMENT`.
- Bổ sung các cột billing, enum trạng thái, index và foreign key.
- Cho phép các cột legacy `start_time`/`end_time` để `NULL`, tránh làm hỏng insert theo schema mới.

Đã chạy thành công:

```text
npm run db:migrate
No migrations were executed, database schema was already up to date.
```

Đã kiểm tra tạo và xóa `RentalSession` thực tế thành công trên database hiện tại.

## 6. Kiểm thử

- Backend: `88 pass, 0 fail`.
- NetClient: `12 pass, 0 fail`.
- Migration syntax và `git diff --check`: hợp lệ đối với các file triển khai; một số trailing whitespace là thay đổi có sẵn trong `NexusControl`.

## 7. Lưu ý vận hành

- Combo hiện bắt đầu tính thời gian từ lúc mua theo lựa chọn nghiệp vụ hiện tại.
- Giá PAYG được tính từ `price_per_hour / 60`, làm tròn 2 chữ số thập phân.
- Docker daemon không chạy trong môi trường kiểm tra; database MySQL local tại `127.0.0.1:3306` đã được repair và xác minh.
