import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';

import catsRouter from './routes/cats.js';
import shelterRouter from './routes/shelter.js';
import authRouter from './routes/auth.js';

import './models/Cat.js';
import './models/BasicUser.js';
import './models/Shelter.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/cats', catsRouter);
app.use('/api/shelter', shelterRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  try {
    await connectDatabase();
    await sequelize.sync({ alter: process.env.DB_SYNC_ALTER === 'true' });
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