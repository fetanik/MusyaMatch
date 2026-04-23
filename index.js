import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config({ path: '.env' });

// Debug: Check if environment variables are loaded
console.log('GEMINI KEY:', process.env.GEMINI_API_KEY ? 'FOUND' : 'MISSING');
console.log('Current working directory:', process.cwd());
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import catsRouter from './routes/cats.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Ensure models are registered before sequelize.sync()
import './models/Cat.js';

const app = express();
const PORT = Number(process.env.PORT) || 3306;

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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const systemPrompt = `You are Musya, a warm and friendly AI cat expert who genuinely loves cats! 🐱 You're here to have natural conversations about feline friends and give helpful advice.

Your personality:
- Passionate about cats and their wellbeing
- Friendly, warm, and conversational
- Uses cat-themed emojis naturally (🐱, 🐾, 😻, 🌟, 🧶, 🍽️, 🏥)
- Shares interesting cat facts when relevant
- Gives practical, caring advice
- Speaks like a fellow cat lover, not a robot

Keep responses:
- Natural and conversational (not rigid templates)
- 2-4 sentences for most responses
- Helpful and specific to the user's question
- Include emojis naturally, not forced
- End with a warm cat-related closing when appropriate

Examples of natural responses:
User: "How often should I feed my kitten?"
You: "🐱 Kittens need to eat more frequently than adult cats - about 3-4 small meals daily! Their tiny tummies can't handle large portions. 😻 Always provide fresh water too! 💧"

User: "Why does my cat stare at me?"
You: "🐾 That's actually a sign of affection! Cats slow blink when they trust you, and staring is their way of showing interest. Try slow blinking back - they love it! 😻"

Remember: Be natural, caring, and adapt to each conversation! ✨`;

    const prompt = `${systemPrompt}\n\nUser: ${message}\n\nMusya:`;
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });

  } catch (err) {
    console.error('Gemini error details:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ reply: "⚠️ Sorry, I'm having trouble responding. Please try again! 🐱" });
  }
});

app.post('/api/match', async (req, res) => {
  const { answers } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    // Get all cats from database
    const { Cat } = await import('./models/Cat.js');
    const cats = await Cat.findAll({
      where: { status: 'available' }
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Create matching prompt
    const prompt = `
Based on the user's questionnaire answers, analyze and recommend the best cats from the available list.

User Answers:
${JSON.stringify(answers, null, 2)}

Available Cats:
${JSON.stringify(cats.map(cat => cat.toJSON()), null, 2)}

Please analyze the compatibility and return a JSON response with:
1. Top 3 recommended cats
2. Compatibility score (0-100) for each
3. Brief explanation for each recommendation
4. Sort by compatibility score (highest first)

Response format:
{
  "recommendations": [
    {
      "cat_id": 1,
      "cat_name": "Cat Name",
      "compatibility_score": 95,
      "reason": "Explanation of why this cat matches"
    }
  ]
}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    
    try {
      const recommendations = JSON.parse(reply);
      res.json(recommendations);
    } catch (parseError) {
      // If AI response is not valid JSON, return the raw text
      res.json({ 
        recommendations: [],
        raw_response: reply,
        error: "Failed to parse AI recommendations"
      });
    }

  } catch (err) {
    console.error('Matching error:', err);
    res.status(500).json({ 
      recommendations: [],
      error: err.message || 'Matching service error' 
    });
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
