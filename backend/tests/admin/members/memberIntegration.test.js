/**
 * ==============================================================================
 * BỘ KIỂM THỬ TÍCH HỢP HỆ THỐNG VỚI CƠ SỞ DỮ LIỆU MYSQL & SEQUELIZE ORM
 * (MEMBER MODULE REAL DATABASE INTEGRATION TESTS)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [INT-01] Ghi nhận thực tế vào MySQL (Tạo User + Member 1-1 + Password Hash)
 * 2. [INT-02] Liên kết & Eager Loading: User, Member, MembershipRank & ComputerStatusLog
 * 3. [INT-03] Cập nhật thông tin hồ sơ & Trạng thái tài khoản trong MySQL thật
 * 4. [INT-04] Nghiệp vụ tài chính & Điểm tích lũy trên bản ghi cơ sở dữ liệu thật
 * 5. [INT-05] Ràng buộc khóa ngoại & Toàn vẹn dữ liệu (Foreign Key Integrity)
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const db = require('../../../src/models');
const memberService = require('../../../src/services/memberService');
const { UserRole, UserStatus } = require('../../../src/constants/enums');

// Helper xóa an toàn dữ liệu test
async function cleanupMember(userId) {
  if (!userId) return;
  try {
    await db.Member.destroy({ where: { member_id: userId } });
    await db.User.destroy({ where: { user_id: userId } });
  } catch (_ignored) {
    // Bỏ qua lỗi teardown
  }
}

test('[Member Module] MySQL Database & Sequelize ORM Integration Test Suite', async (suite) => {
  // Đảm bảo kết nối DB sẵn sàng
  await db.sequelize.authenticate();

  const timestamp = Date.now();
  const testUsername = `mb_it_${timestamp}`;
  let createdUserId = null;

  suite.after(async () => {
    if (createdUserId) {
      await cleanupMember(createdUserId);
    }
  });

  // ----------------------------------------------------------------------------
  // [INT-01] Tạo User & Member thực tế trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-01] [MySQL Persistence] Tạo mới hội viên lưu vào bảng users và members thật', async () => {
    const newMember = await memberService.createMember({
      username: testUsername,
      fullName: 'Hội Viên Test IT',
      password: 'plain_password_123',
      phone: '0988776655',
      tier: 'gold',
      deposit: 300000
    });

    assert.ok(newMember.id, 'Phải sinh ID hội viên');
    createdUserId = newMember.id;

    // Kiểm tra trực tiếp trong bảng users của MySQL
    const userInDb = await db.User.findByPk(createdUserId);
    assert.ok(userInDb, 'Bản ghi user phải tồn tại trong CSDL MySQL');
    assert.strictEqual(userInDb.username, testUsername);
    assert.strictEqual(userInDb.full_name, 'Hội Viên Test IT');
    assert.strictEqual(userInDb.role, UserRole.MEMBER);
    assert.strictEqual(userInDb.status, UserStatus.ACTIVE);

    // Kiểm tra mật khẩu đã được hash bcrypt an toàn
    const isPasswordHashed = await bcrypt.compare('plain_password_123', userInDb.password_hash);
    assert.ok(isPasswordHashed, 'Mật khẩu phải được hash an toàn trong MySQL');

    // Kiểm tra trực tiếp trong bảng members của MySQL
    const memberInDb = await db.Member.findByPk(createdUserId);
    assert.ok(memberInDb, 'Bản ghi member phải tồn tại trong CSDL MySQL');
    assert.strictEqual(memberInDb.phone, '0988776655');
    assert.strictEqual(parseFloat(memberInDb.real_balance), 300000);
    // Hạng gold thưởng 10% -> 30,000
    assert.strictEqual(parseFloat(memberInDb.bonus_balance), 30000);
    assert.strictEqual(memberInDb.point, 300);
    assert.strictEqual(memberInDb.rank_id, 3); // Rank Vàng (rank_id = 3)
  });

  // ----------------------------------------------------------------------------
  // [INT-02] Eager loading & Truy vấn chi tiết hội viên từ MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-02] [ORM Associations] Eager loading User, Rank & Logs thành công', async () => {
    assert.ok(createdUserId, 'Phải có createdUserId từ test trước');

    const memberDetail = await memberService.getMemberById(createdUserId);
    assert.ok(memberDetail, 'Phải truy vấn được thông tin hội viên');
    assert.strictEqual(memberDetail.member_id, createdUserId);
    assert.strictEqual(memberDetail.userInfo.username, testUsername);
    assert.strictEqual(memberDetail.MembershipRank.name, 'Vàng');
    assert.strictEqual(parseFloat(memberDetail.real_balance), 300000);
    assert.strictEqual(parseFloat(memberDetail.bonus_balance), 30000);
    assert.strictEqual(memberDetail.point, 300);

    // Kiểm tra trong danh sách tất cả hội viên (getAllMembers)
    const allMembers = await memberService.getAllMembers();
    const foundInList = allMembers.find((m) => m.id === createdUserId);
    assert.ok(foundInList, 'Hội viên vừa tạo phải xuất hiện trong danh sách tổng getAllMembers()');
    assert.strictEqual(foundInList.username, testUsername);
  });

  // ----------------------------------------------------------------------------
  // [INT-03] Cập nhật thông tin và trạng thái tài khoản vào MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-03] [MySQL Update] Cập nhật thông tin hồ sơ và trạng thái tài khoản', async () => {
    assert.ok(createdUserId);

    // 1. Cập nhật hồ sơ (fullName & phone)
    const updatedInfo = await memberService.updateMemberInfo(createdUserId, {
      fullName: 'Hội Viên Đã Đổi Tên',
      phone: '0911223344'
    });

    assert.strictEqual(updatedInfo.full_name, 'Hội Viên Đã Đổi Tên');
    assert.strictEqual(updatedInfo.phone, '0911223344');

    // Xác minh lại trong DB
    const userDbAfter = await db.User.findByPk(createdUserId);
    const memberDbAfter = await db.Member.findByPk(createdUserId);
    assert.strictEqual(userDbAfter.full_name, 'Hội Viên Đã Đổi Tên');
    assert.strictEqual(memberDbAfter.phone, '0911223344');

    // 2. Cập nhật trạng thái tài khoản sang LOCKED
    const updatedStatus = await memberService.updateAccountStatus(createdUserId, UserStatus.LOCKED);
    assert.strictEqual(updatedStatus.status, UserStatus.LOCKED);

    const userDbLocked = await db.User.findByPk(createdUserId);
    assert.strictEqual(userDbLocked.status, UserStatus.LOCKED);

    // Mở khóa lại sang ACTIVE
    await memberService.updateAccountStatus(createdUserId, UserStatus.ACTIVE);
    const userDbActive = await db.User.findByPk(createdUserId);
    assert.strictEqual(userDbActive.status, UserStatus.ACTIVE);
  });

  // ----------------------------------------------------------------------------
  // [INT-04] Nghiệp vụ tài chính & Điểm tích lũy trên bản ghi DB thực tế
  // ----------------------------------------------------------------------------
  await suite.test('[INT-04] [Financial Logic] TopUp, Withdraw, AddPoint & CanPay trên DB instance', async () => {
    assert.ok(createdUserId);

    const memberInstance = await db.Member.findByPk(createdUserId);
    assert.ok(memberInstance);

    // 1. TopUp nạp thêm 100,000 vào real_balance
    await memberInstance.topUp(100000, false);
    assert.strictEqual(parseFloat(memberInstance.real_balance), 400000);

    // 2. TopUp nạp thêm 20,000 vào bonus_balance
    await memberInstance.topUp(20000, true);
    assert.strictEqual(parseFloat(memberInstance.bonus_balance), 50000);

    // 3. Rút 50,000 khỏi real_balance
    await memberInstance.withdraw(50000);
    assert.strictEqual(parseFloat(memberInstance.real_balance), 350000);

    // 4. Cộng / trừ điểm
    await memberInstance.addPoint(50);
    assert.strictEqual(memberInstance.point, 350);
    await memberInstance.deductPoint(30);
    assert.strictEqual(memberInstance.point, 320);

    // 5. Kiểm tra khả năng thanh toán canPay (350k + 50k = 400k)
    assert.strictEqual(memberInstance.canPay(400000), true);
    assert.strictEqual(memberInstance.canPay(400001), false);

    // Reload lại từ DB để đảm bảo đã lưu bền vững
    await memberInstance.reload();
    assert.strictEqual(parseFloat(memberInstance.real_balance), 350000);
    assert.strictEqual(parseFloat(memberInstance.bonus_balance), 50000);
    assert.strictEqual(memberInstance.point, 320);
  });

  // ----------------------------------------------------------------------------
  // [INT-05] Ràng buộc trùng lặp username trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-05] [Integrity] Bắt lỗi ràng buộc khi tạo hội viên trùng username', async () => {
    await assert.rejects(
      () => memberService.createMember({
        username: testUsername, // Trùng với user đã tạo ở INT-01
        fullName: 'Hội Viên Trùng Lặp',
        password: 'pass'
      }),
      /Tên đăng nhập đã tồn tại trong hệ thống/
    );
  });
});
