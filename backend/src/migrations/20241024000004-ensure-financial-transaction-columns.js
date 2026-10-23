'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const addCol = async (colName, colType) => {
      try {
        await queryInterface.sequelize.query(`ALTER TABLE \`financial_transaction\` ADD COLUMN \`${colName}\` ${colType}`);
      } catch (err) {
        // Column already exists
      }
    };

    await addCol('txn_code', 'VARCHAR(50) NULL');
    await addCol('category', 'VARCHAR(50) NULL');
    await addCol('payment_method', 'VARCHAR(50) NULL');
    await addCol('status', 'VARCHAR(30) NULL');
    await addCol('computer_name', 'VARCHAR(50) NULL');
    await addCol('staff_name', 'VARCHAR(100) NULL');
    await addCol('notes', 'TEXT NULL');
  },

  async down(_queryInterface, _Sequelize) {
  }
};
