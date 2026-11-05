'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => String(table).toLowerCase());

    if (!tableNames.includes('rental_session')) {
      await queryInterface.createTable('rental_session', {
        rental_session_id: {
          type: Sequelize.BIGINT,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        computer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'computer', key: 'computer_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        member_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'members', key: 'member_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        combo_time_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'combo_time', key: 'combo_time_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        billing_mode: {
          type: Sequelize.ENUM('COMBO', 'PAY_AS_YOU_GO'),
          allowNull: false,
          defaultValue: 'PAY_AS_YOU_GO'
        },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'ENDED', 'INSUFFICIENT_BALANCE', 'LOGGED_OUT'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        started_at: { type: Sequelize.DATE, allowNull: false },
        last_billed_at: { type: Sequelize.DATE, allowNull: false },
        ended_at: { type: Sequelize.DATE, allowNull: true },
        total_amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0.00
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
    } else {
      let description = await queryInterface.describeTable('rental_session');
      if (description.session_id && !description.rental_session_id) {
        await queryInterface.renameColumn('rental_session', 'session_id', 'rental_session_id');
        description = await queryInterface.describeTable('rental_session');
      }

      const columns = {
        rental_session_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        computer_id: { type: Sequelize.INTEGER, allowNull: true },
        member_id: { type: Sequelize.INTEGER, allowNull: true },
        combo_time_id: { type: Sequelize.INTEGER, allowNull: true },
        billing_mode: {
          type: Sequelize.ENUM('COMBO', 'PAY_AS_YOU_GO'),
          allowNull: false,
          defaultValue: 'PAY_AS_YOU_GO'
        },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'ENDED', 'INSUFFICIENT_BALANCE', 'LOGGED_OUT'),
          allowNull: false,
          defaultValue: 'ACTIVE'
        },
        started_at: { type: Sequelize.DATE, allowNull: true },
        last_billed_at: { type: Sequelize.DATE, allowNull: true },
        ended_at: { type: Sequelize.DATE, allowNull: true },
        total_amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        created_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.fn('NOW') }
      };

      for (const [column, definition] of Object.entries(columns)) {
        if (!description[column]) {
          await queryInterface.addColumn('rental_session', column, definition);
        }
      }

      await queryInterface.sequelize.query(
        'UPDATE `rental_session` SET `started_at` = COALESCE(`started_at`, NOW()), `last_billed_at` = COALESCE(`last_billed_at`, `started_at`), `total_amount` = COALESCE(`total_amount`, 0)'
      );

      await queryInterface.changeColumn('rental_session', 'status', columns.status);
      await queryInterface.changeColumn('rental_session', 'started_at', {
        type: Sequelize.DATE,
        allowNull: false
      });
      await queryInterface.changeColumn('rental_session', 'last_billed_at', {
        type: Sequelize.DATE,
        allowNull: false
      });
      await queryInterface.changeColumn('rental_session', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      });
      await queryInterface.changeColumn('rental_session', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      });
      if (description.start_time) {
        await queryInterface.changeColumn('rental_session', 'start_time', {
          type: Sequelize.DATE,
          allowNull: true
        });
      }
      if (description.end_time) {
        await queryInterface.changeColumn('rental_session', 'end_time', {
          type: Sequelize.DATE,
          allowNull: true
        });
      }
    }

    await queryInterface.sequelize.query(
      'ALTER TABLE `rental_session` MODIFY COLUMN `rental_session_id` BIGINT NOT NULL AUTO_INCREMENT'
    );

    const constraints = await queryInterface.showConstraint('rental_session');
    const constraintNames = new Set(constraints.map((constraint) => constraint.constraintName));
    const foreignKeys = [
      ['rental_session_computer_fk', 'computer_id', 'computer', 'computer_id', 'RESTRICT'],
      ['rental_session_member_fk', 'member_id', 'members', 'member_id', 'RESTRICT'],
      ['rental_session_combo_time_fk', 'combo_time_id', 'combo_time', 'combo_time_id', 'SET NULL']
    ];
    for (const [name, field, table, targetKey, onDelete] of foreignKeys) {
      if (!constraintNames.has(name)) {
        await queryInterface.addConstraint('rental_session', {
          fields: [field],
          type: 'foreign key',
          name,
          references: { table, field: targetKey },
          onUpdate: 'CASCADE',
          onDelete
        });
      }
    }

    const indexes = await queryInterface.showIndex('rental_session');
    const indexNames = new Set(indexes.map((index) => index.name));
    const requiredIndexes = [
      ['rental_session_active_billing_idx', ['status', 'last_billed_at']],
      ['rental_session_member_status_idx', ['member_id', 'status']],
      ['rental_session_computer_status_idx', ['computer_id', 'status']]
    ];
    for (const [name, fields] of requiredIndexes) {
      if (!indexNames.has(name)) {
        await queryInterface.addIndex('rental_session', fields, { name });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rental_session');
  }
};
