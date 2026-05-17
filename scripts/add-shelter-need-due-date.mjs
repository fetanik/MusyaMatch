/**
 * Adds shelter_need.due_date (idempotent). Uses root .env (DB_*).
 * Run from project root: npm run db:add-need-due-date
 */
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config({ path: '.env' });

const dbName = process.env.DB_NAME?.trim();
const dbUser = process.env.DB_USER?.trim();
if (!dbName || !dbUser) {
  console.error('Missing DB_NAME or DB_USER in .env');
  process.exit(1);
}

const sequelize = new Sequelize(dbName, dbUser, process.env.DB_PASSWORD ?? '', {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
});

try {
  await sequelize.query(
    'ALTER TABLE shelter_need ADD COLUMN due_date DATE NULL AFTER status'
  );
  console.log('OK: column due_date added.');
} catch (err) {
  const code = err?.parent?.code || err?.original?.code;
  const msg = String(err?.message || '');
  if (code === 'ER_DUP_FIELDNAME' || msg.includes('Duplicate column')) {
    console.log('OK: due_date already exists — nothing to do.');
  } else {
    console.error(err);
    process.exit(1);
  }
} finally {
  await sequelize.close();
}
