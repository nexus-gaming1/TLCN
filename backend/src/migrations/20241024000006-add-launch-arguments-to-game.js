'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    const addCol = async (table, colName, colType) => {
      try {
        await queryInterface.sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${colName}\` ${colType}`);
      } catch (err) {
        // Column already exists or table not created yet
      }
    };
    await addCol('game', 'is_remote_supported', 'TINYINT(1) DEFAULT 0');
    await addCol('game', 'is_available', 'TINYINT(1) DEFAULT 1');

    try {
      await queryInterface.sequelize.query('ALTER TABLE `game` MODIFY COLUMN `cover_image_url` LONGTEXT NULL');
    } catch (err) {
      // Ignored
    }
  },

  async down(_queryInterface, _Sequelize) {
  }
};
