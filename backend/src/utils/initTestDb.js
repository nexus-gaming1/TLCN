const db = require('../models');
const runMigrations = require('./migrationRunner');
const seedData = require('./seeder');

async function initTestDb() {
  try {
    console.log('🔄 Đang đồng bộ hóa cấu trúc bảng CSDL (db.sequelize.sync)...');
    await db.sequelize.sync();
    console.log('✅ Toàn bộ cấu trúc bảng (bao gồm computer, users, members) đã được tạo thành công!');

    console.log('🔄 Đang chạy migrations cập nhật schema...');
    await runMigrations();
    console.log('✅ Migrations hoàn tất!');

    console.log('🌱 Đang nạp dữ liệu kiểm thử (Seeder)...');
    await seedData(db);
    console.log('🎉 CSDL kiểm thử đã sẵn sàng 100% cho test suite!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khởi tạo CSDL kiểm thử:', err);
    process.exit(1);
  }
}

initTestDb();
