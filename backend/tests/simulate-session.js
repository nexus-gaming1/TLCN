require('dotenv').config();
const db = require('../src/models');
const { ComputerStatus } = require('../src/constants/enums');

async function main() {
  const args = process.argv.slice(2);
  const action = (args[0] || 'status').toLowerCase();
  const username = args[1] || 'user';

  console.log('====================================================');
  console.log(`NEXUS CYBER - CÔNG CỤ GIẢ LẬP PHIÊN CHƠI MÁY TRẠM`);
  console.log(`Mục tiêu: Tài khoản '${username}' | Thao tác: ${action.toUpperCase()}`);
  console.log('====================================================');

  try {
    // 1. Tìm thông tin User và Member
    const user = await db.User.findOne({
      where: { username },
      include: [{ model: db.Member, as: 'memberProfile' }]
    });

    if (!user || !user.memberProfile) {
      console.error(`Không tìm thấy thông tin hội viên cho username '${username}'!`);
      console.log(`Gợi ý: Hãy kiểm tra danh sách user trong bảng Users hoặc dùng username mặc định 'user'.`);
      process.exit(1);
    }

    const memberId = user.memberProfile.member_id;

    // 2. Xử lý các kịch bản
    if (action === 'logout' || action === 'clear' || action === 'end') {
      // Đăng xuất: Kết thúc toàn bộ phiên ACTIVE
      const activeSessions = await db.RentalSession.findAll({
        where: { member_id: memberId, status: db.RentalSession.Status.ACTIVE }
      });

      for (const s of activeSessions) {
        s.status = db.RentalSession.Status.ENDED;
        s.ended_at = new Date();
        await s.save();

        const comp = await db.Computer.findByPk(s.computer_id);
        if (comp && comp.status !== ComputerStatus.MAINTENANCE) {
          comp.status = ComputerStatus.ONLINE;
          await comp.save();
        }
      }

      console.log(`Đã kết thúc toàn bộ phiên chơi của hội viên '${username}'.`);
      console.log(`Trạng thái Web: Khách ở nhà, chưa có máy trạm.`);
      console.log(`Hãy F5 trang web http://localhost:5173/customer/orders:`);
      console.log(`   - Vị trí phục vụ: 'Chưa có máy'`);
      console.log(`   - Nút [XÁC NHẬN ĐẶT MÓN] bị KHÓA`);
      console.log(`   - Hiển thị thông báo: 'Bạn cần mở máy trạm trực tiếp...'`);
      process.exit(0);
    }

    if (action === 'in-shop' || action === 'station' || action === 'local') {
      // Đóng phiên cũ trước
      await db.RentalSession.update(
        { status: db.RentalSession.Status.ENDED, ended_at: new Date() },
        { where: { member_id: memberId, status: db.RentalSession.Status.ACTIVE } }
      );

      // Tìm máy VIP-01 hoặc máy đầu tiên
      let comp = await db.Computer.findOne({ where: { computer_name: 'VIP-01' } });
      if (!comp) {
        comp = await db.Computer.findOne();
      }

      if (!comp) {
        console.error('CSDL chưa có máy trạm nào trong bảng Computers! Hãy chạy seed data.');
        process.exit(1);
      }

      // Đặt trạng thái máy IN_USE
      comp.status = ComputerStatus.IN_USE;
      await comp.save();

      // Tạo phiên ACTIVE tại phòng máy
      const newSession = await db.RentalSession.create({
        member_id: memberId,
        computer_id: comp.computer_id,
        billing_mode: db.RentalSession.BillingMode.PAY_AS_YOU_GO,
        status: db.RentalSession.Status.ACTIVE,
        started_at: new Date(),
        last_billed_at: new Date()
      });

      console.log(`ĐÃ KÍCH HOẠT THÀNH CÔNG PHIÊN CHƠI TẠI QUÁN (IN-SHOP):`);
      console.log(`   - Hội viên: ${user.full_name || username} (Member ID: ${memberId})`);
      console.log(`   - Máy trạm: [${comp.computer_name}] (ID: ${comp.computer_id})`);
      console.log(`   - Trạng thái máy: ${comp.status}`);
      console.log(`   - Mã phiên RentalSession: #${newSession.session_id}`);
      console.log('----------------------------------------------------');
      console.log(` Hãy F5 trang web http://localhost:5173/customer/orders:`);
      console.log(`   - Vị trí phục vụ sẽ hiển thị ngay: [${comp.computer_name}]`);
      console.log(`   - Nút [XÁC NHẬN ĐẶT MÓN] sẽ SÁNG XANH và cho phép đặt món!`);
      console.log(`   - Khi đặt xong, đơn hàng sẽ map chính xác tên máy [${comp.computer_name}] sang Staff KDS!`);
      process.exit(0);
    }

    if (action === 'remote') {
      // Đóng phiên cũ trước
      await db.RentalSession.update(
        { status: db.RentalSession.Status.ENDED, ended_at: new Date() },
        { where: { member_id: memberId, status: db.RentalSession.Status.ACTIVE } }
      );

      // Tìm máy ESP-01 hoặc máy đầu tiên
      let comp = await db.Computer.findOne({ where: { computer_name: 'ESP-01' } });
      if (!comp) {
        comp = await db.Computer.findOne();
      }

      if (!comp) {
        console.error('CSDL chưa có máy trạm nào trong bảng Computers!');
        process.exit(1);
      }

      // Đặt trạng thái máy là REMOTE
      comp.status = ComputerStatus.REMOTE;
      await comp.save();

      // Tạo phiên ACTIVE từ xa
      const newSession = await db.RentalSession.create({
        member_id: memberId,
        computer_id: comp.computer_id,
        billing_mode: db.RentalSession.BillingMode.PAY_AS_YOU_GO,
        status: db.RentalSession.Status.ACTIVE,
        started_at: new Date(),
        last_billed_at: new Date()
      });

      console.log(`ĐÃ KÍCH HOẠT THÀNH CÔNG PHIÊN CHƠI TỪ XA (REMOTE):`);
      console.log(`   - Hội viên: ${user.full_name || username} (Member ID: ${memberId})`);
      console.log(`   - Máy trạm stream: [${comp.computer_name}] (Trạng thái: REMOTE)`);
      console.log(`   - Mã phiên RentalSession: #${newSession.session_id}`);
      console.log('----------------------------------------------------');
      console.log(` Hãy F5 trang web http://localhost:5173/customer/orders:`);
      console.log(`   - Sẽ xuất hiện BANNER CẢNH BÁO MÀU CAM:`);
      console.log(`     "Tài khoản đang trong phiên chơi từ xa (Remote Session). F&B chỉ phục vụ tại quán."`);
      console.log(`   - Nút [XÁC NHẬN ĐẶT MÓN] bị KHÓA hoàn toàn!`);
      process.exit(0);
    }

    // Mặc định: Xem trạng thái hiện tại
    const active = await db.RentalSession.findOne({
      where: { member_id: memberId, status: db.RentalSession.Status.ACTIVE },
      include: [{ model: db.Computer, as: 'computer' }]
    });

    if (!active) {
      console.log(`Hiện tại hội viên '${username}' KHÔNG CÓ phiên chơi nào đang hoạt động.`);
      console.log(`Cách kích hoạt để test:`);
      console.log(`   node tests/simulate-session.js in-shop ${username}  -> Giả lập ngồi máy tại quán`);
      console.log(`   node tests/simulate-session.js remote ${username}   -> Giả lập chơi từ xa`);
    } else {
      console.log(`Phiên hiện tại của hội viên '${username}':`);
      console.log(`   - Phiên: #${active.session_id} (Bắt đầu: ${active.started_at})`);
      console.log(`   - Máy: [${active.computer?.computer_name || 'Không rõ'}]`);
      console.log(`   - Trạng thái máy: ${active.computer?.status}`);
      console.log(`   - Phân loại: ${active.computer?.status === ComputerStatus.REMOTE ? 'CHƠI TỪ XA (REMOTE)' : 'NGỒI TẠI QUÁN (IN-SHOP)'}`);
      console.log(`Để kết thúc phiên:`);
      console.log(`   node tests/simulate-session.js logout ${username}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi giả lập phiên chơi:', err);
    process.exit(1);
  }
}

main();
