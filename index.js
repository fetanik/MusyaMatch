import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import catsRouter from './routes/cats.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ reply: err.message || 'AI error' });
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
    //await connectDatabase();
    //await sequelize.sync();
    console.log("ENV KEY:", process.env.GEMINI_API_KEY ? "OK" : "MISSING");
    app.listen(PORT, () => {
      console.log(`MusyaMatch API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
