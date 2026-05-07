import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
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
    await connectDatabase();
    const shouldAlterSchema =
      process.env.DB_SYNC_ALTER !== undefined
        ? process.env.DB_SYNC_ALTER === 'true'
        : process.env.NODE_ENV !== 'production';
    await sequelize.sync({ alter: shouldAlterSchema });
    app.listen(PORT, () => {
      console.log(`MusyaMatch API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err?.message || err);
    if (err?.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

start();