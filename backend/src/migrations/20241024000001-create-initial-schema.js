'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create users table if not exists
    await queryInterface.createTable('users', {
      user_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      full_name: { type: Sequelize.STRING(100), allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'CUSTOMER' },
      phone_number: { type: Sequelize.STRING(20), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'ACTIVE' },
      last_login: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    }).catch(() => {});

    // 2. Create membership_ranks table
    await queryInterface.createTable('membership_ranks', {
      rank_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(50), allowNull: false }
    }).catch(() => {});

    // 3. Create pricing_plans table
    await queryInterface.createTable('pricing_plans', {
      pricing_plan_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false }
    }).catch(() => {});

    // 4. Create members table
    await queryInterface.createTable('members', {
      member_id: { type: Sequelize.INTEGER, primaryKey: true },
      rank_id: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      real_balance: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
      bonus_balance: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0.00 },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    }).catch(() => {});

    // 5. Create financial_transaction table
    await queryInterface.createTable('financial_transaction', {
      transaction_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      txn_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'INCOME' },
      category: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'TOPUP' },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0.00 },
      payment_method: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'CASH' },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'SUCCESS' },
      member_id: { type: Sequelize.INTEGER, allowNull: true },
      order_id: { type: Sequelize.INTEGER, allowNull: true },
      computer_name: { type: Sequelize.STRING(50), allowNull: true },
      staff_name: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    }).catch(() => {});
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('financial_transaction').catch(() => {});
    await queryInterface.dropTable('members').catch(() => {});
    await queryInterface.dropTable('pricing_plans').catch(() => {});
    await queryInterface.dropTable('membership_ranks').catch(() => {});
    await queryInterface.dropTable('users').catch(() => {});
  }
};
