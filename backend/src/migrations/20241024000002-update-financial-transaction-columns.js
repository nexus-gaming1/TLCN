'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const safeAddColumn = async (table, column, type) => {
      try {
        await queryInterface.addColumn(table, column, type);
      } catch (err) {
        // Column already exists or table not ready, safely ignore
      }
    };

    await safeAddColumn('financial_transaction', 'txn_code', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'category', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'payment_method', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'status', {
      type: Sequelize.STRING(30),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'computer_name', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await safeAddColumn('financial_transaction', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(_queryInterface, _Sequelize) {
    // Revert columns if needed
  }
};
