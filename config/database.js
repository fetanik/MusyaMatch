import { Sequelize } from 'sequelize';

function assertDbEnv() {
  const dbName = process.env.DB_NAME?.trim();
  const dbUser = process.env.DB_USER?.trim();
  if (!dbName || !dbUser) {
    throw new Error(
      'Missing DB_NAME or DB_USER. Create a file named .env in the project root (copy from .env.example) and set MySQL credentials, then restart the server.'
    );
  }
}

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD ?? '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      connectTimeout: 15000,
    },
    pool: {
      acquire: 20000,
    },
  }
);

export async function connectDatabase() {
  assertDbEnv();
  await sequelize.authenticate();
}