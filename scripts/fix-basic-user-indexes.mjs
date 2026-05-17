/**
 * Removes duplicate email_/nickname_ indexes created by repeated Sequelize alter sync.
 * Run once: node scripts/fix-basic-user-indexes.mjs
 */
import { sequelize } from '../config/database.js';

const KEEP = new Set(['PRIMARY', 'email', 'nickname']);

async function main() {
  await sequelize.authenticate();
  const [rows] = await sequelize.query('SHOW INDEX FROM basic_user');
  const names = [...new Set(rows.map((r) => r.Key_name))];
  const toDrop = names.filter((name) => !KEEP.has(name));

  if (toDrop.length === 0) {
    console.log('No duplicate indexes to drop.');
    await sequelize.close();
    return;
  }

  console.log(`Dropping ${toDrop.length} duplicate index(es)…`);
  for (const name of toDrop) {
    try {
      await sequelize.query(`ALTER TABLE basic_user DROP INDEX \`${name}\``);
      console.log(`  dropped ${name}`);
    } catch (err) {
      console.warn(`  skip ${name}:`, err?.parent?.sqlMessage || err.message);
    }
  }

  const [after] = await sequelize.query('SHOW INDEX FROM basic_user');
  const afterNames = [...new Set(after.map((r) => r.Key_name))];
  console.log('Remaining indexes:', afterNames.join(', '));
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
