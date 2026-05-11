import { sequelize } from './database.js';

/**
 * Old `database.sql` used role ENUM('user','admin') only. Registration as shelter
 * manager requires 'manager'. Sequelize sync/alter does not always expand MySQL ENUMs.
 */
export async function ensureAuthSchemaMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  try {
    await sequelize.query(
      "ALTER TABLE basic_user MODIFY COLUMN role ENUM('user', 'manager', 'admin') NOT NULL DEFAULT 'user'"
    );
  } catch (err) {
    const msg = String(err?.parent?.message || err?.message || err || '');
    if (/Unknown table|doesn't exist|check that column exists/i.test(msg)) {
      return;
    }
    console.warn('[db] ensureAuthSchemaMysql (role enum):', msg);
  }
}
