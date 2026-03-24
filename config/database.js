import { Sequelize } from 'sequelize';

/**
 * Sequelize instance for MySQL. Expects DB_* and optional DB_PORT in process.env
 * (load dotenv in index.js before importing this module).
 */
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

/**
 * Verifies TCP/auth to MySQL. Call once on startup before sync or queries.
 */
export async function connectDatabase() {
  await sequelize.authenticate();
}
