'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const safeAddColumn = async (table, column, spec) => {
      try {
        await queryInterface.addColumn(table, column, spec);
      } catch (err) {
        // Ignore if already exists
      }
    };

    await safeAddColumn('users', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await safeAddColumn('users', 'email', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await safeAddColumn('users', 'status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'ACTIVE'
    });

    await safeAddColumn('users', 'last_login', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await safeAddColumn('members', 'points', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(_queryInterface, _Sequelize) {
    // Revert columns if needed
  }
};
