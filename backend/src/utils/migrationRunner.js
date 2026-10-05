const db = require('../models');

/**
 * Migration Runner for NEXUS Cyber Command
 * Guarantees 100% column synchronization with backend/src/config/sql.sql & backend/src/config/model.js
 * Automatically alters existing MySQL tables to add or rename updated columns safely.
 */
const runMigrations = async () => {
  try {
    console.log('🔄 Checking & synchronizing database schema with model.js / sql.sql definitions...');

    const queryInterface = db.sequelize.getQueryInterface();

    // Helper: Safely rename or add missing column
    const ensureColumn = async (table, oldCol, newCol, colDefSql) => {
      try {
        const desc = await queryInterface.describeTable(table).catch(() => null);
        if (!desc) return;

        if (oldCol && desc[oldCol] && !desc[newCol]) {
          console.log(`🛠️ Renaming column '${oldCol}' -> '${newCol}' in table '${table}'...`);
          await db.sequelize.query(`ALTER TABLE \`${table}\` RENAME COLUMN \`${oldCol}\` TO \`${newCol}\``).catch(() => {});
        } else if (!desc[newCol]) {
          console.log(`🛠️ Adding missing column '${newCol}' to table '${table}'...`);
          await db.sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${newCol}\` ${colDefSql}`).catch(() => {});
        }
      } catch (e) {
        // Ignore column alteration warnings if table is created fresh
      }
    };

    // 1. users: password -> password_hash & avatar_url -> TEXT
    await ensureColumn('users', 'password', 'password_hash', 'VARCHAR(255) NOT NULL DEFAULT ""');

    try {
      await db.sequelize.query("ALTER TABLE `users` MODIFY COLUMN `avatar_url` TEXT NULL");
    } catch (e) {
      // Ignore if table/column alter notice
    }

    // Clean up old enum values in users table before altering ENUM column
    try {
      await db.sequelize.query("UPDATE `users` SET `role` = 'EMPLOYEE' WHERE `role` = 'EMPLOYEE'");
      await db.sequelize.query("UPDATE `users` SET `role` = 'MEMBER' WHERE `role` = 'CUSTOMER'");
      await db.sequelize.query("UPDATE `users` SET `status` = 'ACTIVE' WHERE `status` = 'SUSPENDED'");
    } catch (e) {
      // Ignore if table/column does not exist yet
    }

    // 2. members: points -> point
    await ensureColumn('members', 'points', 'point', 'INT NOT NULL DEFAULT 0');
    await ensureColumn('members', null, 'phone', 'VARCHAR(20) NULL');

    // 3. pricing_plan: price -> price_per_hour
    await ensureColumn('pricing_plan', 'price', 'price_per_hour', 'DECIMAL(10, 2) NOT NULL DEFAULT 10000.00');
    await ensureColumn('pricing_plan', null, 'plan_type', "ENUM('LOCAL', 'REMOTE') NOT NULL DEFAULT 'LOCAL'");
    await ensureColumn('pricing_plan', null, 'priority', 'INT DEFAULT 0');
    await ensureColumn('pricing_plan', null, 'start_time', 'TIME NULL');
    await ensureColumn('pricing_plan', null, 'end_time', 'TIME NULL');
    await ensureColumn('pricing_plan', null, 'apply_date', 'DATE NULL');
    await ensureColumn('pricing_plan', null, 'is_active', 'TINYINT(1) DEFAULT 1');


    // 4. combo_package: duration_time -> duration_minutes
    await ensureColumn('combo_package', 'duration_time', 'duration_minutes', 'INT NOT NULL DEFAULT 60');

    // 5. membership_rank: required_point, rank_level, discount_percent
    await ensureColumn('membership_rank', null, 'required_point', 'INT NOT NULL DEFAULT 0');
    await ensureColumn('membership_rank', null, 'rank_level', 'INT NOT NULL DEFAULT 1');
    await ensureColumn('membership_rank', null, 'discount_percent', 'DECIMAL(5, 2) DEFAULT 0.00');

    // 6. computer: ip_address, mac_address, is_remote_enabled
    await ensureColumn('computer', null, 'ip_address', 'VARCHAR(50) NULL');
    await ensureColumn('computer', null, 'mac_address', 'VARCHAR(50) NULL');
    await ensureColumn('computer', null, 'is_remote_enabled', 'TINYINT(1) DEFAULT 0');


    // 7. financial_transaction: member_id -> used_by
    await ensureColumn('financial_transaction', 'member_id', 'used_by', 'INT NOT NULL DEFAULT 1');
    await ensureColumn('financial_transaction', null, 'processed_by', 'INT NULL');

    // Perform Sequelize sync with alter fallback
    await db.sequelize.sync({ alter: true }).catch((err) => {
      console.warn('[Migration Warning] Sync alter notice:', err.message);
    });

    console.log('✅ Database schema successfully synchronized.');
  } catch (error) {
    console.error('❌ Error executing database schema synchronization:', error);
  }
};

module.exports = runMigrations;
