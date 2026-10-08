const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const db = require('../models');

/**
 * Migration Runner for NEXUS Cyber Command
 * Programmatically executes all pending Sequelize migrations on app startup.
 */
const runMigrations = async () => {
  try {
    const umzug = new Umzug({
      migrations: {
        glob: path.resolve(__dirname, '*.js')
      },
      context: db.sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize: db.sequelize }),
      logger: console
    });

    console.log('🔄 Checking & executing pending Sequelize Migrations...');
    const executed = await umzug.up();
    if (executed && executed.length > 0) {
      console.log(`✅ Successfully executed ${executed.length} Sequelize migration(s):`, executed.map((m) => m.name));
    } else {
      console.log('✅ Database schema is up to date (No pending migrations).');
    }
  } catch (error) {
    console.error('❌ Error executing Sequelize Migrations:', error);
    throw error;
  }
};

module.exports = runMigrations;
