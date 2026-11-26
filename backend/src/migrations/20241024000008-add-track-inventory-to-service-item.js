'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableDesc = await queryInterface.describeTable('service_item');
      if (!tableDesc.track_inventory) {
        await queryInterface.addColumn('service_item', 'track_inventory', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        });
      }
    } catch (err) {
      // Bỏ qua an toàn nếu bảng chưa được tạo ở thời điểm chạy hoặc cột đã tồn tại
      console.warn('[Migration] add-track-inventory-to-service-item skipped:', err.message);
    }
  },

  async down(queryInterface) {
    try {
      const tableDesc = await queryInterface.describeTable('service_item');
      if (tableDesc.track_inventory) {
        await queryInterface.removeColumn('service_item', 'track_inventory');
      }
    } catch (err) {
      console.warn('[Migration] remove track_inventory skipped:', err.message);
    }
  }
};