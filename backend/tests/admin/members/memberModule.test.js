const test = require('node:test');
const assert = require('node:assert');
const db = require('../../../src/models');
const memberService = require('../../../src/services/memberService');
const memberController = require('../../../src/controllers/memberController');
const memberRoutes = require('../../../src/routes/memberRoutes');

/**
 * ==============================================================================
 * MA TRẬN TEST CASE NÂNG CAO CHO MODULE QUẢN LÝ HỘI VIÊN (MEMBER MANAGEMENT)
 * Đạt chuẩn Review:
 * 1. Test nghiệp vụ thực tế (Business Reality)
 * 2. Bao phủ toàn diện các trường hợp biên & input dị (Edge Cases: null, undefined, số âm, rỗng)
 * 3. Đảm bảo tính độc lập tuyệt đối giữa các test case (Test Isolation)
 * 4. Mock/Stub phản ánh chính xác hành vi ORM Sequelize & API contract
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1 & 2: MODEL MEMBER - NGHIỆP VỤ THỰC TẾ & CÁC TRƯỜNG HỢP BIÊN
// ------------------------------------------------------------------------------
test('[TC-01] [Model] Member Model - Các phương thức nghiệp vụ tài chính, điểm và điều kiện biên', async () => {
  // Khởi tạo instance độc lập
  const member = db.Member.build({
    member_id: 100,
    phone: '0901234567',
    real_balance: 100000.00,
    bonus_balance: 20000.00,
    point: 50,
    rank_id: 1
  });

  // Mock save method độc lập trên instance
  member.save = async function () { return this; };

  // 1. Nghiệp vụ nạp tiền (topUp)
  await member.topUp(50000, false);
  assert.strictEqual(parseFloat(member.real_balance), 150000, 'Nạp tiền chính xác vào real_balance');

  await member.topUp(10000, true);
  assert.strictEqual(parseFloat(member.bonus_balance), 30000, 'Nạp tiền chính xác vào bonus_balance');

  // [Biên]: Nạp số 0 hoặc số thực thập phân
  await member.topUp(0, false);
  assert.strictEqual(parseFloat(member.real_balance), 150000);
  await member.topUp(500.50, false);
  assert.strictEqual(parseFloat(member.real_balance), 150500.50);

  // 2. Nghiệp vụ rút tiền (withdraw)
  await member.withdraw(20000.50);
  assert.strictEqual(parseFloat(member.real_balance), 130500);

  // 3. Tích lũy và trừ điểm (addPoint / deductPoint)
  await member.addPoint(100);
  assert.strictEqual(member.point, 150);

  await member.deductPoint(30);
  assert.strictEqual(member.point, 120);

  // [Biên]: Cộng / trừ 0 điểm
  await member.addPoint(0);
  assert.strictEqual(member.point, 120);
  await member.deductPoint(0);
  assert.strictEqual(member.point, 120);

  // 4. Khấu trừ trực tiếp từng quỹ (deductRealBalance & deductBonusBalance)
  await member.deductRealBalance(30500);
  assert.strictEqual(parseFloat(member.real_balance), 100000);

  await member.deductBonusBalance(10000);
  assert.strictEqual(parseFloat(member.bonus_balance), 20000);

  // 5. Kiểm tra khả năng thanh toán (canPay) - Tổng quỹ = 100,000 + 20,000 = 120,000
  assert.strictEqual(member.canPay(120000), true, 'Thanh toán đúng bằng tổng số dư');
  assert.strictEqual(member.canPay(50000), true, 'Thanh toán nhỏ hơn tổng số dư');
  assert.strictEqual(member.canPay(0), true, 'Thanh toán 0 đồng');
  assert.strictEqual(member.canPay(120000.01), false, 'Vượt quá tổng số dư 1 xu');
  assert.strictEqual(member.canPay(999999), false, 'Vượt xa tổng số dư');

  // 6. Nâng / Hạ hạng (changeRank) - Xử lý cả kiểu số nguyên và object
  await member.changeRank(2);
  assert.strictEqual(member.rank_id, 2);

  await member.changeRank({ rank_id: 4, name: 'Kim Cương' });
  assert.strictEqual(member.rank_id, 4);

  // 7. Cập nhật hồ sơ (updateProfile) - Ca biên phone rỗng và hợp lệ
  await member.updateProfile({ phone: '0999888777' });
  assert.strictEqual(member.phone, '0999888777');

  // [Biên]: updateProfile với undefined không làm mất số điện thoại hiện tại
  await member.updateProfile({});
  assert.strictEqual(member.phone, '0999888777');
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1, 2, 3, 4: MEMBERSERVICE - getAllMembers (CHẤT LƯỢNG STUB & BIÊN)
// ------------------------------------------------------------------------------
test('[TC-02] [Service] getAllMembers - Chất lượng Stub Sequelize, liên kết trạm máy & ca biên rỗng', async () => {
  const origFindAll = db.Member.findAll;

  try {
    let capturedOptions = null;

    // 1. [Chất lượng Stub]: Xác minh options truy vấn Sequelize đầy đủ includes và order
    db.Member.findAll = async (options) => {
      capturedOptions = options;
      return [
        {
          member_id: 2,
          phone: '0900000002',
          real_balance: '500000.00',
          bonus_balance: '50000.00',
          point: 200,
          rank_id: 3,
          created_at: '2026-01-01T00:00:00.000Z',
          userInfo: {
            user_id: 2,
            username: 'user02',
            full_name: 'Khách VIP 2',
            role: 'MEMBER',
            status: 'ACTIVE'
          },
          MembershipRank: {
            rank_id: 3,
            name: 'Vàng'
          },
          ComputerStatusLogs: [
            {
              Computer: {
                computer_id: 1,
                computer_name: 'VIP-01',
                status: 'IN_USE'
              }
            }
          ]
        },
        // [Ca biên]: Hội viên vãng lai, thiếu thông tin quan hệ, ComputerStatusLogs rỗng
        {
          member_id: 3,
          phone: null,
          real_balance: 0,
          bonus_balance: 0,
          point: 0,
          rank_id: 1,
          created_at: null,
          userInfo: null,
          MembershipRank: null,
          ComputerStatusLogs: []
        },
        // [Ca biên]: ComputerStatusLogs có bản ghi nhưng Computer là null (máy đã bị xóa/offline)
        {
          member_id: 4,
          phone: '',
          real_balance: null,
          bonus_balance: null,
          point: null,
          rank_id: null,
          created_at: null,
          userInfo: { username: 'testuser', full_name: null, status: null },
          MembershipRank: null,
          ComputerStatusLogs: [{ Computer: null }]
        },
        // [Ca biên]: userInfo có object nhưng tất cả thuộc tính đều null
        {
          member_id: 5,
          phone: null,
          real_balance: 0,
          bonus_balance: 0,
          point: 0,
          rank_id: null,
          created_at: null,
          userInfo: { username: null, full_name: null, status: null },
          MembershipRank: null,
          ComputerStatusLogs: []
        }
      ];
    };

    const result = await memberService.getAllMembers();

    // Xác thực chất lượng stub Sequelize
    assert.ok(capturedOptions, 'Phải truyền options vào db.Member.findAll');
    assert.strictEqual(capturedOptions.order[0][0], 'member_id');
    assert.strictEqual(capturedOptions.order[0][1], 'ASC');
    assert.strictEqual(capturedOptions.include.length, 3, 'Phải include User, MembershipRank, ComputerStatusLog');

    // Xác thực nghiệp vụ mapping
    assert.strictEqual(result.length, 4);

    // Member 1: Đầy đủ quan hệ
    assert.strictEqual(result[0].id, 2);
    assert.strictEqual(result[0].uid, '#MB-002');
    assert.strictEqual(result[0].name, 'Khách VIP 2');
    assert.strictEqual(result[0].rank_name, 'Vàng');
    assert.strictEqual(result[0].station_name, 'VIP-01');
    assert.strictEqual(result[0].station_status, 'IN_USE');
    assert.strictEqual(result[0].real_balance, 500000);

    // Member 2: Fallback khi thiếu quan hệ
    assert.strictEqual(result[1].name, 'Hội Viên');
    assert.strictEqual(result[1].rank_name, 'Đồng');
    assert.strictEqual(result[1].station_name, null);

    // Member 3: Các giá trị null/rỗng
    assert.strictEqual(result[2].name, 'Hội Viên');
    assert.strictEqual(result[2].real_balance, 0);
    assert.strictEqual(result[2].bonus_balance, 0);
    assert.strictEqual(result[2].points, 0);
    assert.strictEqual(result[2].station_name, null);

    // Member 4: userInfo có object nhưng thuộc tính null
    assert.strictEqual(result[3].name, 'Hội Viên');
    assert.strictEqual(result[3].username, '');

    // 2. [Ca biên]: CSDL trả về mảng rỗng []
    db.Member.findAll = async () => [];
    const emptyResult = await memberService.getAllMembers();
    assert.deepStrictEqual(emptyResult, []);

    // 3. [Ca âm]: Lỗi mất kết nối CSDL (Timeout)
    db.Member.findAll = async () => { throw new Error('SequelizeConnectionError: Connection timeout'); };
    await assert.rejects(
      async () => await memberService.getAllMembers(),
      /SequelizeConnectionError/
    );
  } finally {
    // Đảm bảo Test Isolation tuyệt đối
    db.Member.findAll = origFindAll;
  }
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1, 2, 3: MEMBERSERVICE - getMemberById
// ------------------------------------------------------------------------------
test('[TC-03] [Service] getMemberById - Tìm thấy, không tìm thấy và các input dị', async () => {
  const origFindByPk = db.Member.findByPk;

  try {
    let capturedId = null;
    let capturedOptions = null;

    db.Member.findByPk = async (id, options) => {
      capturedId = id;
      capturedOptions = options;
      if (id === 5) {
        return {
          member_id: 5,
          userInfo: { full_name: 'Nguyễn Văn A' },
          MembershipRank: { name: 'Kim Cương' }
        };
      }
      return null;
    };

    // 1. [Ca dương]: Tìm thấy hội viên hợp lệ
    const found = await memberService.getMemberById(5);
    assert.ok(found);
    assert.strictEqual(found.member_id, 5);
    assert.strictEqual(capturedId, 5);
    assert.strictEqual(capturedOptions.include.length, 2);

    // 2. [Ca âm]: ID không tồn tại trong CSDL
    const notFound = await memberService.getMemberById(9999);
    assert.strictEqual(notFound, null);

    // 3. [Ca biên & Input dị]: ID âm, null, undefined, chuỗi không hợp lệ
    assert.strictEqual(await memberService.getMemberById(-1), null);
    assert.strictEqual(await memberService.getMemberById(null), null);
    assert.strictEqual(await memberService.getMemberById(undefined), null);
    assert.strictEqual(await memberService.getMemberById('abc'), null);

    // 4. [Ca ngoại lệ CSDL]
    db.Member.findByPk = async () => { throw new Error('Query error'); };
    await assert.rejects(
      async () => await memberService.getMemberById(5),
      /Query error/
    );
  } finally {
    db.Member.findByPk = origFindByPk;
  }
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1, 2, 3, 4: MEMBERSERVICE - updateMemberInfo
// ------------------------------------------------------------------------------
test('[TC-04] [Service] updateMemberInfo - Cập nhật chọn lọc, bảo toàn dữ liệu & ca biên', async () => {
  const origMemberFindByPk = db.Member.findByPk;
  const origUserFindByPk = db.User.findByPk;

  try {
    let userSaved = false;
    let memberSaved = false;

    const mockMember = {
      member_id: 10,
      phone: '0901111111',
      save: async () => { memberSaved = true; },
      toJSON: function () { return { member_id: this.member_id, phone: this.phone }; }
    };

    const mockUser = {
      user_id: 10,
      full_name: 'Tên Ban Đầu',
      save: async () => { userSaved = true; },
      toJSON: function () { return { user_id: this.user_id, full_name: this.full_name }; }
    };

    db.Member.findByPk = async (id) => {
      if (id === 10) return mockMember;
      if (id === 20) return mockMember;
      return null;
    };

    db.User.findByPk = async (id) => {
      if (id === 10) return mockUser;
      if (id === 20) return null;
      return null;
    };

    // 1. [Ca dương]: Cập nhật cả 2 trường Họ tên và SĐT (qua phone_number)
    const updated = await memberService.updateMemberInfo(10, {
      full_name: 'Nguyễn Văn Mới',
      phone_number: '0902222222'
    });
    assert.ok(updated);
    assert.strictEqual(mockUser.full_name, 'Nguyễn Văn Mới');
    assert.strictEqual(mockMember.phone, '0902222222');
    assert.strictEqual(userSaved, true);
    assert.strictEqual(memberSaved, true);

    // 2. [Ca dương]: Cập nhật qua trường phone
    userSaved = false;
    memberSaved = false;
    await memberService.updateMemberInfo(10, { phone: '0903333333' });
    assert.strictEqual(mockMember.phone, '0903333333');
    assert.strictEqual(mockUser.full_name, 'Nguyễn Văn Mới', 'Họ tên được bảo toàn không bị ghi đè');

    // 3. [Ca biên]: Cập nhật object rỗng {} - Không làm thay đổi dữ liệu hiện tại
    await memberService.updateMemberInfo(10, {});
    assert.strictEqual(mockMember.phone, '0903333333');
    assert.strictEqual(mockUser.full_name, 'Nguyễn Văn Mới');

    // 4. [Ca âm]: Hội viên không tồn tại
    assert.strictEqual(await memberService.updateMemberInfo(999, { full_name: 'A' }), null);

    // 5. [Ca dị]: Hội viên tồn tại nhưng không có User
    const resNoUser = await memberService.updateMemberInfo(20, { full_name: 'B' });
    assert.ok(resNoUser);
    assert.strictEqual(resNoUser.userInfo, null);

    // 6. [Ca ngoại lệ CSDL]
    db.Member.findByPk = async () => { throw new Error('SequelizeDatabaseError'); };
    await assert.rejects(
      async () => await memberService.updateMemberInfo(10, {}),
      /SequelizeDatabaseError/
    );
  } finally {
    db.Member.findByPk = origMemberFindByPk;
    db.User.findByPk = origUserFindByPk;
  }
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1, 2, 3: MEMBERSERVICE - updateAccountStatus
// ------------------------------------------------------------------------------
test('[TC-05] [Service] updateAccountStatus - Validation Enum chặt chẽ, ca âm & ca biên', async () => {
  const origMemberFindByPk = db.Member.findByPk;
  const origUserFindByPk = db.User.findByPk;

  try {
    let savedStatus = null;
    let saveCalled = false;

    const mockMember = {
      member_id: 6,
      toJSON: function () { return { member_id: this.member_id }; }
    };

    const mockUser = {
      user_id: 6,
      status: 'ACTIVE',
      save: async function () {
        savedStatus = this.status;
        saveCalled = true;
      },
      toJSON: function () { return { user_id: this.user_id, status: this.status }; }
    };

    db.Member.findByPk = async (id) => {
      if (id === 6) return mockMember;
      if (id === 30) return mockMember;
      return null;
    };

    db.User.findByPk = async (id) => {
      if (id === 6) return mockUser;
      if (id === 30) return null; // Không có User
      return null;
    };

    // 1. [Ca dương]: Cập nhật chính xác 4 trạng thái theo enum hệ thống
    const allowedStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED', 'BANNED'];
    for (const st of allowedStatuses) {
      saveCalled = false;
      const res = await memberService.updateAccountStatus(6, st);
      assert.ok(res);
      assert.strictEqual(savedStatus, st);
      assert.strictEqual(saveCalled, true);
    }

    // 2. [Ca âm & Input dị]: Các trạng thái không hợp lệ (sai chính tả, chữ thường, null, undefined, số)
    const invalidStatuses = ['INVALID', 'active', 'locked', '', null, undefined, 12345, {}, []];
    for (const inv of invalidStatuses) {
      await assert.rejects(
        async () => await memberService.updateAccountStatus(6, inv),
        /Trạng thái tài khoản không hợp lệ/,
        `Phải ném lỗi khi truyền trạng thái không hợp lệ: ${inv}`
      );
    }

    // 3. [Ca âm]: ID không tồn tại
    assert.strictEqual(await memberService.updateAccountStatus(999, 'ACTIVE'), null);

    // 4. [Ca dị]: ID tồn tại nhưng User = null
    assert.strictEqual(await memberService.updateAccountStatus(30, 'LOCKED'), null);

    // 5. [Ca ngoại lệ CSDL]
    db.Member.findByPk = async () => { throw new Error('DB Update Error'); };
    await assert.rejects(
      async () => await memberService.updateAccountStatus(6, 'LOCKED'),
      /DB Update Error/
    );
  } finally {
    db.Member.findByPk = origMemberFindByPk;
    db.User.findByPk = origUserFindByPk;
  }
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1, 2, 4: MEMBERCONTROLLER - HTTP PROTOCOL CONTRACT
// ------------------------------------------------------------------------------
test('[TC-06] [Controller] MemberController - HTTP response codes, format & next(error) forwarding', async () => {
  const origGetAll = memberService.getAllMembers;
  const origGetById = memberService.getMemberById;
  const origUpdateInfo = memberService.updateMemberInfo;
  const origUpdateStatus = memberService.updateAccountStatus;

  try {
    const createMockRes = () => {
      const res = {};
      res.statusCode = 200;
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (data) => { res.body = data; return res; };
      return res;
    };

    // 1. getMembers (200 & Next error)
    memberService.getAllMembers = async () => [{ id: 1, name: 'Hội viên 1' }];
    let res = createMockRes();
    await memberController.getMembers({}, res, () => { });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.length, 1);

    let caughtErr = null;
    memberService.getAllMembers = async () => { throw new Error('Service Failure'); };
    await memberController.getMembers({}, res, (err) => { caughtErr = err; });
    assert.strictEqual(caughtErr.message, 'Service Failure');

    // 2. getMemberById (200, 404, Next error)
    memberService.getMemberById = async (id) => (id === '1' ? { id: 1, name: 'VIP' } : null);
    res = createMockRes();
    await memberController.getMemberById({ params: { id: '1' } }, res, () => { });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');

    res = createMockRes();
    await memberController.getMemberById({ params: { id: '999' } }, res, () => { });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Không tìm thấy hội viên');

    caughtErr = null;
    memberService.getMemberById = async () => { throw new Error('GetById DB Failure'); };
    await memberController.getMemberById({ params: { id: '1' } }, res, (err) => { caughtErr = err; });
    assert.strictEqual(caughtErr.message, 'GetById DB Failure');

    // 3. updateMemberInfo (200, 404, Next error)
    memberService.updateMemberInfo = async (id) => (id === '1' ? { id: 1, name: 'Updated' } : null);
    res = createMockRes();
    await memberController.updateMemberInfo({ params: { id: '1' }, body: {} }, res, () => { });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');

    res = createMockRes();
    await memberController.updateMemberInfo({ params: { id: '999' }, body: {} }, res, () => { });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, 'Không tìm thấy hội viên để cập nhật');

    caughtErr = null;
    memberService.updateMemberInfo = async () => { throw new Error('Update Info Failure'); };
    await memberController.updateMemberInfo({ params: { id: '1' }, body: {} }, res, (err) => { caughtErr = err; });
    assert.strictEqual(caughtErr.message, 'Update Info Failure');

    // 4. updateAccountStatus (200, 404, Next error)
    memberService.updateAccountStatus = async (id, status) => (id === '1' ? { id: 1, status } : null);
    res = createMockRes();
    await memberController.updateAccountStatus({ params: { id: '1' }, body: { status: 'LOCKED' } }, res, () => { });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.message, 'Đã đổi trạng thái tài khoản thành LOCKED');

    res = createMockRes();
    await memberController.updateAccountStatus({ params: { id: '999' }, body: { status: 'LOCKED' } }, res, () => { });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, 'Không tìm thấy hội viên để đổi trạng thái');

    caughtErr = null;
    memberService.updateAccountStatus = async () => { throw new Error('Update Status Failure'); };
    await memberController.updateAccountStatus({ params: { id: '1' }, body: { status: 'LOCKED' } }, res, (err) => { caughtErr = err; });
    assert.strictEqual(caughtErr.message, 'Update Status Failure');

    // 5. createMember (201, 400, Next error)
    const origCreateMember = memberService.createMember;
    memberService.createMember = async (data) => ({ id: 99, username: data.username, name: data.fullName });
    res = createMockRes();
    await memberController.createMember({ body: { username: 'testuser', fullName: 'Test User' } }, res, () => { });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.message, 'Tạo tài khoản hội viên thành công');

    // 400 validation error
    memberService.createMember = async () => { throw new Error('Tên đăng nhập đã tồn tại trong hệ thống'); };
    res = createMockRes();
    await memberController.createMember({ body: { username: 'testuser', fullName: 'Test User' } }, res, () => { });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.status, 'error');

    // 500 unhandled error
    caughtErr = null;
    memberService.createMember = async () => { throw new Error('Database Fatal Crash'); };
    await memberController.createMember({ body: { username: 'testuser', fullName: 'Test User' } }, res, (err) => { caughtErr = err; });
    assert.strictEqual(caughtErr.message, 'Database Fatal Crash');

    memberService.createMember = origCreateMember;
  } finally {
    memberService.getAllMembers = origGetAll;
    memberService.getMemberById = origGetById;
    memberService.updateMemberInfo = origUpdateInfo;
    memberService.updateAccountStatus = origUpdateStatus;
  }
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ 1 & 4: MEMBERROUTES - EXPRESS ROUTER DEFINITION
// ------------------------------------------------------------------------------
test('[TC-07] [Routes] MemberRoutes - Đảm bảo chính xác HTTP methods và route paths', () => {
  assert.ok(memberRoutes.stack, 'Router phải có danh sách stack layers');
  const registeredRoutes = memberRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods)
    }));

  assert.ok(registeredRoutes.some((r) => r.path === '/' && r.methods.includes('get')), 'GET /');
  assert.ok(registeredRoutes.some((r) => r.path === '/' && r.methods.includes('post')), 'POST /');
  assert.ok(registeredRoutes.some((r) => r.path === '/:id' && r.methods.includes('get')), 'GET /:id');
  assert.ok(registeredRoutes.some((r) => r.path === '/:id/info' && r.methods.includes('put')), 'PUT /:id/info');
  assert.ok(registeredRoutes.some((r) => r.path === '/:id/status' && r.methods.includes('put')), 'PUT /:id/status');
});

// ------------------------------------------------------------------------------
// TIÊU CHÍ: MEMBERSERVICE - CREATEMEMBER NGHIỆP VỤ & VALIDATION
// ------------------------------------------------------------------------------
test('[TC-08] [Service] MemberService.createMember - Nghiệp vụ tạo hội viên, phân hạng, bonus và điều kiện biên', async () => {
  const origFindOne = db.User.findOne;
  const origUserCreate = db.User.create;
  const origMemberCreate = db.Member.create;

  try {
    // 1. Validation lỗi bỏ trống username hoặc fullName
    await assert.rejects(
      () => memberService.createMember({ username: '', fullName: 'Nam' }),
      /Tên đăng nhập không được để trống/
    );
    await assert.rejects(
      () => memberService.createMember({ username: 'valid_user', fullName: '   ' }),
      /Họ và tên hội viên không được để trống/
    );

    // 2. Validation trùng lặp username
    db.User.findOne = async () => ({ user_id: 1, username: 'existing_user' });
    await assert.rejects(
      () => memberService.createMember({ username: 'existing_user', fullName: 'Nguyễn Văn A' }),
      /Tên đăng nhập đã tồn tại trong hệ thống/
    );

    // 3. Tạo thành công hội viên với các hạng khác nhau (diamond, gold, silver, normal)
    db.User.findOne = async () => null;
    let createdUserRecord = null;
    let createdMemberRecord = null;

    db.User.create = async (userData) => {
      createdUserRecord = { user_id: 888, ...userData };
      return createdUserRecord;
    };
    db.Member.create = async (memberData) => {
      createdMemberRecord = memberData;
      return createdMemberRecord;
    };

    // Case Diamond (15% bonus)
    const resultDiamond = await memberService.createMember({
      username: 'gamer_diamond',
      fullName: 'Trần Đại Gia',
      password: 'mypassword',
      phone: '0912345678',
      tier: 'diamond',
      deposit: 1000000
    });

    assert.strictEqual(resultDiamond.id, 888);
    assert.strictEqual(resultDiamond.rank_name, 'Kim Cương');
    assert.strictEqual(resultDiamond.real_balance, 1000000);
    assert.strictEqual(resultDiamond.bonus_balance, 150000);
    assert.strictEqual(resultDiamond.points, 1000);
    assert.strictEqual(resultDiamond.phone, '0912345678');

    // Case Gold (10% bonus)
    const resultGold = await memberService.createMember({
      username: 'gamer_gold',
      fullName: 'Vàng Hội Viên',
      tier: 'gold',
      deposit: 500000
    });
    assert.strictEqual(resultGold.rank_name, 'Vàng');
    assert.strictEqual(resultGold.bonus_balance, 50000);

    // Case Silver (5% bonus)
    const resultSilver = await memberService.createMember({
      username: 'gamer_silver',
      fullName: 'Bạc Hội Viên',
      tier: 'silver',
      deposit: 200000
    });
    assert.strictEqual(resultSilver.rank_name, 'Bạc');
    assert.strictEqual(resultSilver.bonus_balance, 10000);

    // Case Normal default (0% bonus, không có phone)
    const resultNormal = await memberService.createMember({
      username: 'gamer_normal',
      fullName: 'Đồng Hội Viên',
      tier: 'normal',
      deposit: 50000
    });
    assert.strictEqual(resultNormal.rank_name, 'Đồng');
    assert.strictEqual(resultNormal.bonus_balance, 0);
    assert.strictEqual(resultNormal.phone, 'Chưa cập nhật');
  } finally {
    db.User.findOne = origFindOne;
    db.User.create = origUserCreate;
    db.Member.create = origMemberCreate;
  }
});
