'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => String(table).toLowerCase());

    if (!tableNames.includes('remote_pairing')) {
      await queryInterface.createTable('remote_pairing', {
        id: {
          type: Sequelize.CHAR(36),
          primaryKey: true,
          allowNull: false
        },
        rental_session_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'rental_session', key: 'rental_session_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        computer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'computer', key: 'computer_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        pairing_id: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        device_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        device_address: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'CONFIRMING', 'PAIRED', 'EXPIRED', 'FAILED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        failure_reason: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      });

      await queryInterface.addIndex('remote_pairing', ['rental_session_id'], {
        name: 'idx_remote_pairing_session'
      });
      await queryInterface.addIndex('remote_pairing', ['computer_id', 'status'], {
        name: 'idx_remote_pairing_computer_status'
      });
      await queryInterface.addIndex('remote_pairing', ['status', 'expires_at'], {
        name: 'idx_remote_pairing_expires_status'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('remote_pairing');
  }
};

