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

/**
 * `database.sql` in repo predates achievements; Sequelize sync may be off in prod.
 * Marketplace redeem writes here — create table if missing so redeem does not 500.
 */
export async function ensureEventsExtraColumnsMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  const alters = [
    'ALTER TABLE events ADD COLUMN event_time TIME NULL AFTER date',
    'ALTER TABLE events ADD COLUMN max_participants INT NULL AFTER cost',
  ];

  for (const sql of alters) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      const msg = String(err?.parent?.sqlMessage || err?.message || err || '');
      if (/Duplicate column/i.test(msg)) continue;
      console.warn('[db] ensureEventsExtraColumnsMysql:', msg);
    }
  }
}

export async function ensureEventRegistrationTableMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS event_registration (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        phone VARCHAR(50) NOT NULL,
        comment TEXT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_event_registration_event (event_id),
        KEY idx_event_registration_user (user_id),
        UNIQUE KEY uq_event_registration_event_user (event_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    const msg = String(err?.parent?.message || err?.message || err || '');
    console.warn('[db] ensureEventRegistrationTableMysql:', msg);
  }
}

export async function ensureAchievementEventTableMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS achievement_event (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        cat_id INT NULL,
        type VARCHAR(64) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        meta LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_achievement_event_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    const msg = String(err?.parent?.message || err?.message || err || '');
    console.warn('[db] ensureAchievementEventTableMysql:', msg);
  }
}

/** Foster listing columns on `cat` (see sql/add_foster_flow_columns.sql). */
/** Align legacy `shelter_need` tables with models/Need.js (status, priority, due_date, etc.). */
export async function ensureShelterNeedSchemaMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  const alters = [
    "ALTER TABLE shelter_need ADD COLUMN category VARCHAR(64) NOT NULL DEFAULT 'General' AFTER description",
    "ALTER TABLE shelter_need ADD COLUMN priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' AFTER category",
    "ALTER TABLE shelter_need ADD COLUMN status ENUM('open', 'fulfilled') NOT NULL DEFAULT 'open' AFTER priority",
    'ALTER TABLE shelter_need ADD COLUMN due_date DATE NULL AFTER status',
  ];

  for (const sql of alters) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      const msg = String(err?.parent?.sqlMessage || err?.message || err || '');
      if (/Duplicate column/i.test(msg)) continue;
      console.warn('[db] ensureShelterNeedSchemaMysql:', msg);
    }
  }
}

export async function ensureCatFosterColumnsMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  const alters = [
    'ALTER TABLE cat ADD COLUMN foster_start_date DATE NULL',
    'ALTER TABLE cat ADD COLUMN foster_end_date DATE NULL',
    'ALTER TABLE cat ADD COLUMN foster_city VARCHAR(255) NULL',
    'ALTER TABLE cat ADD COLUMN foster_comment TEXT NULL',
  ];

  for (const sql of alters) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      const msg = String(err?.parent?.sqlMessage || err?.message || err || '');
      if (/Duplicate column/i.test(msg)) continue;
      console.warn('[db] ensureCatFosterColumnsMysql:', msg);
    }
  }
}

/** Foster request fields on `adoption_request` (see sql/add_foster_flow_columns.sql). */
export async function ensureAdoptionRequestFosterColumnsMysql() {
  if (sequelize.getDialect() !== 'mysql') return;

  const alters = [
    'ALTER TABLE adoption_request ADD COLUMN experience_level VARCHAR(32) NULL AFTER type',
    'ALTER TABLE adoption_request ADD COLUMN start_date DATE NULL AFTER experience_level',
    'ALTER TABLE adoption_request ADD COLUMN end_date DATE NULL AFTER start_date',
  ];

  for (const sql of alters) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      const msg = String(err?.parent?.sqlMessage || err?.message || err || '');
      if (/Duplicate column/i.test(msg)) continue;
      console.warn('[db] ensureAdoptionRequestFosterColumnsMysql:', msg);
    }
  }
}
