import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import catsRouter from './routes/cats.js';

// Ensure models are registered before sequelize.sync()
import './models/Cat.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

/** Lightweight health check (does not require DB). */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/cats', catsRouter);

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const reply = `🐱 AI: я отримав твоє повідомлення → "${message}"`;

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: 'Chat error' });
  }
});

/** Central error handler for async route errors passed via next(err). */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

/**
 * Connects to MySQL, syncs models (dev-friendly), starts HTTP server.
 * For production, prefer Sequelize migrations instead of sync().
 */
async function start() {
  try {
    await connectDatabase();
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`MusyaMatch API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
