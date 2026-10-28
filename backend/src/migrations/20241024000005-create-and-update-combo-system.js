'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Ensure combo_package table exists
    await queryInterface.createTable('combo_package', {
      combo_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60 },
      start_time_limit: { type: Sequelize.TIME, allowNull: true },
      end_time_limit: { type: Sequelize.TIME, allowNull: true },
      allowed_tier: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true }
    }).catch(() => {});

    // Ensure description column in combo_package
    const comboPkgDesc = await queryInterface.describeTable('combo_package').catch(() => null);
    if (comboPkgDesc && !comboPkgDesc.description) {
      await queryInterface.addColumn('combo_package', 'description', {
        type: Sequelize.TEXT,
        allowNull: true
      }).catch(() => {});
    }

    // 2. Ensure combo_item table exists
    await queryInterface.createTable('combo_item', {
      combo_id: { type: Sequelize.INTEGER, primaryKey: true },
      service_item_id: { type: Sequelize.INTEGER, primaryKey: true },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 }
    }).catch(() => {});

    // 3. Ensure service_order columns: combo_id, total_amount
    const serviceOrderDesc = await queryInterface.describeTable('service_order').catch(() => null);
    if (serviceOrderDesc) {
      if (!serviceOrderDesc.combo_id) {
        await queryInterface.addColumn('service_order', 'combo_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        }).catch(() => {});
      }
      if (!serviceOrderDesc.total_amount) {
        await queryInterface.addColumn('service_order', 'total_amount', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0.00
        }).catch(() => {});
      }
    }

    // 4. Ensure service_order_item column: is_combo_item
    const serviceOrderItemDesc = await queryInterface.describeTable('service_order_item').catch(() => null);
    if (serviceOrderItemDesc && !serviceOrderItemDesc.is_combo_item) {
      await queryInterface.addColumn('service_order_item', 'is_combo_item', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }).catch(() => {});
    }

    // 5. Ensure combo_time table exists and has all required columns
    await queryInterface.createTable('combo_time', {
      combo_time_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      start_time: { type: Sequelize.DATE, allowNull: true },
      end_time: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'),
        defaultValue: 'PENDING'
      },
      allowed_tier: { type: Sequelize.INTEGER, allowNull: true },
      order_id: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      combo_id: { type: Sequelize.INTEGER, allowNull: true },
      computer_id: { type: Sequelize.INTEGER, allowNull: true },
      duration_minutes: { type: Sequelize.INTEGER, allowNull: true }
    }).catch(() => {});

    const comboTimeDesc = await queryInterface.describeTable('combo_time').catch(() => null);
    if (comboTimeDesc) {
      if (!comboTimeDesc.combo_id) {
        await queryInterface.addColumn('combo_time', 'combo_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        }).catch(() => {});
      }
      if (!comboTimeDesc.computer_id) {
        await queryInterface.addColumn('combo_time', 'computer_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        }).catch(() => {});
      }
      if (!comboTimeDesc.duration_minutes) {
        await queryInterface.addColumn('combo_time', 'duration_minutes', {
          type: Sequelize.INTEGER,
          allowNull: true
        }).catch(() => {});
      }
      // Update ENUM to include PENDING if needed
      try {
        await queryInterface.sequelize.query(
          "ALTER TABLE `combo_time` MODIFY COLUMN `status` ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING'"
        );
      } catch (e) {
        // Ignored if unsupported or already matching
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Non-destructive down to prevent data loss
  }
};
