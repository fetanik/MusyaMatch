import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import { ensureAuthSchemaMysql } from './config/ensureAuthSchema.js';
import path from 'path';

import catsRouter from './routes/cats.js';
import shelterRouter from './routes/shelter.js';
import authRouter from './routes/auth.js';
import achievementsRouter from './routes/achievements.js';
import needsRouter from './routes/needs.js';

import './models/Cat.js';
import './models/BasicUser.js';
import './models/Shelter.js';
import './models/Vaccination.js';
import './models/AchievementEvent.js';
import './models/Need.js';
import './models/AdoptionRequest.js';

import usersRouter from './routes/users.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/cats', catsRouter);
app.use('/api/shelter', shelterRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/needs', needsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.use('/api/users', usersRouter);

async function start() {
  try {
    console.log('Connecting to MySQL…');
    await connectDatabase();
    console.log('MySQL connection OK.');
    const shouldAlterSchema =
      process.env.DB_SYNC_ALTER !== undefined
        ? process.env.DB_SYNC_ALTER === 'true'
        : process.env.NODE_ENV !== 'production';
    console.log(`Sequelize sync (alter=${shouldAlterSchema})…`);
    await sequelize.sync({ alter: shouldAlterSchema });
    await ensureAuthSchemaMysql();
    const server = app.listen(PORT, () => {
      console.log(`MusyaMatch API listening on http://localhost:${PORT}`);
    });
    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use (another server is probably still running). Close that terminal/process, or set a different PORT in .env (e.g. PORT=5001).`
        );
        console.error(
          `Find the process (PowerShell): Get-NetTCPConnection -LocalPort ${PORT} | Select-Object LocalPort, OwningProcess`
        );
      } else {
        console.error('HTTP server failed to start:', listenErr?.message || listenErr);
      }
      process.exit(1);
    });
  } catch (err) {
    const refused =
      err?.name === 'SequelizeConnectionRefusedError' ||
      err?.parent?.code === 'ECONNREFUSED' ||
      err?.original?.code === 'ECONNREFUSED';
    const accessDenied =
      err?.name === 'SequelizeAccessDeniedError' ||
      err?.parent?.code === 'ER_ACCESS_DENIED_ERROR' ||
      err?.original?.code === 'ER_ACCESS_DENIED_ERROR';
    if (refused) {
      console.error(
        'Cannot connect to MySQL (connection refused). Start the MySQL server (Windows: Services / XAMPP), then check DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD in the .env file in the project root.'
      );
    } else if (accessDenied) {
      console.error(
        'MySQL rejected the login (access denied). Open .env in the project root and set DB_USER / DB_PASSWORD to match your MySQL user (same as in MySQL Shell / Workbench). If the error says "using password: NO", DB_PASSWORD is empty — add your root password after DB_PASSWORD=.'
      );
      console.error(err?.message || err);
    } else {
      console.error('Failed to start server:', err?.message || err);
      if (err?.stack) {
        console.error(err.stack);
      }
    }
    process.exit(1);
  }
}

start();