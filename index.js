import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config({ path: '.env' });

// Debug: Check Ollama status
console.log('🦙 Ollama: Using local AI (no API keys needed)');
console.log('Current working directory:', process.cwd());
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import { ensureAuthSchemaMysql } from './config/ensureAuthSchema.js';
import catsRouter from './routes/cats.js';
import shelterRouter from './routes/shelter.js';
import authRouter from './routes/auth.js';
import achievementsRouter from './routes/achievements.js';
import needsRouter from './routes/needs.js';
import eventsRouter from './routes/events.js';

import './models/Cat.js';
import './models/BasicUser.js';
import './models/Shelter.js';
import './models/Vaccination.js';
import './models/AchievementEvent.js';
import './models/Need.js';
import './models/Event.js';
import './models/AdoptionRequest.js';

import usersRouter from './routes/users.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/cats', catsRouter);
app.use('/api/shelter', shelterRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/needs', needsRouter);
app.use('/api/events', eventsRouter);

// Ollama API helper function for chat
async function queryOllama(prompt, system = '') {
  console.log('🦙 Querying Ollama with model: llama3.2');
  console.log('📝 Prompt length:', prompt.length);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: system ? `${system}\n\n${prompt}` : prompt,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Ollama response received, length:', data.response?.length);
    return data.response;
  } catch (error) {
    console.error('❌ Ollama query failed:', error.message);
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timeout (3min). Your computer may be too slow for AI processing.');
    }
    throw error;
  }
}

// Chat endpoint using Ollama
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
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

Remember: Be natural, caring, and adapt to each conversation! ✨`;

    const prompt = `User: ${message}\n\nMusya:`;
    
    const reply = await queryOllama(prompt, systemPrompt);

    res.json({ reply });

  } catch (err) {
    console.error('Ollama error details:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ reply: "⚠️ Sorry, I'm having trouble responding. Make sure Ollama is running! 🐱" });
  }
});

// Simple rule-based cat matching (no AI - instant response)
app.post('/api/match', async (req, res) => {
  const { answers } = req.body;

  try {
    console.log('🔍 Starting cat matching process...');
    console.log('📝 User answers:', answers);

    console.log('🗄️ Fetching cats from database...');
    const { Cat } = await import('./models/Cat.js');
    const cats = await Cat.findAll({
      where: { listingStatus: 'active' },
    });

    console.log(`🐱 Found ${cats.length} cats in database`);
    console.log('⚡ Using fast rule-based matching (no AI)');

    // Calculate compatibility score for each cat
    const recommendations = cats.map(cat => {
      let score = 0;
      const reasons = [];
      
      // Get data values from Sequelize instance
      const catData = cat.get({ plain: true });
      const preference = String(answers.preference || '').toLowerCase();
      const household = String(answers.household || '').toLowerCase();
      const space = String(answers.space || '').toLowerCase();
      const experience = String(answers.experience || '').toLowerCase();
      const specialNeeds = String(answers.special_needs || '').toLowerCase();

      // Experience level matching
      if (experience === 'first_time' && catData.experienceLevel === 'first_time') {
        score += 30;
        reasons.push('Perfect for first-time owners');
      } else if (experience === 'experienced' && catData.experienceLevel === 'experienced') {
        score += 25;
        reasons.push('Great for experienced owners');
      } else if (experience === 'returning') {
        score += 15;
        reasons.push('Balanced match for returning cat parent');
      }

      // Household compatibility
      if (household === 'kids' && catData.goodWithKids) {
        score += 25;
        reasons.push('Good with children');
      } else if (household === 'pets' && catData.goodWithPets) {
        score += 25;
        reasons.push('Good with other pets');
      } else if (household === 'kids_pets' && catData.goodWithKids && catData.goodWithPets) {
        score += 30;
        reasons.push('Great with kids and other pets');
      } else if (household === 'alone') {
        score += 20;
        reasons.push('Perfect companion for solo living');
      }

      // Space requirements
      if (space === 'apartment_small' && catData.spaceRequirements === 'apartment') {
        score += 20;
        reasons.push('Ideal for small apartments');
      } else if (
        space === 'apartment_large' &&
        (catData.spaceRequirements === 'apartment' || catData.spaceRequirements === 'house')
      ) {
        score += 15;
        reasons.push('Comfortable in larger living space');
      } else if (space === 'house' && catData.spaceRequirements === 'house') {
        score += 20;
        reasons.push('Loves having space to play');
      }

      // Age preference matching
      if (preference.includes('kitten') && catData.ageCategory === 'kitten') {
        score += 20;
        reasons.push('Playful kitten energy');
      } else if (preference.includes('adult') && catData.ageCategory === 'adult') {
        score += 20;
        reasons.push('Mature and calm companion');
      }

      // Energy level matching
      if (preference.includes('playful') && catData.energyLevel === 'high') {
        score += 15;
        reasons.push('Playful and energetic');
      } else if (
        preference.includes('calm') &&
        (catData.energyLevel === 'low' || catData.energyLevel === 'medium')
      ) {
        score += 15;
        reasons.push('Calm and relaxed');
      }

      // Special needs
      if (specialNeeds === 'yes' && catData.specialNeeds) {
        score += 15;
        reasons.push('Needs special care you can provide');
      } else if (specialNeeds === 'no' && !catData.specialNeeds) {
        score += 10;
        reasons.push('No special care needed');
      } else if (specialNeeds === 'maybe') {
        score += 5;
      }

      // Add small random factor for variety (0-10 points)
      score += Math.floor(Math.random() * 10);

      // Cap at 100
      score = Math.min(score, 100);

      return {
        cat_id: cat.id,
        cat_name: cat.name,
        compatibility_score: score,
        reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Good overall match',
        cat: {
          id: cat.id,
          name: cat.name,
          breed: catData.breed || null,
          description: catData.description || null,
          age: catData.age ?? null,
          gender: catData.gender || null,
          imageUrl: catData.imageUrl || null,
          experienceLevel: catData.experienceLevel || null,
          energyLevel: catData.energyLevel || null,
          ageCategory: catData.ageCategory || null,
          goodWithKids: Boolean(catData.goodWithKids),
          goodWithPets: Boolean(catData.goodWithPets),
          specialNeeds: Boolean(catData.specialNeeds),
        },
      };
    });

    // Sort by score and take top 3
    recommendations.sort((a, b) => b.compatibility_score - a.compatibility_score);
    const topRecommendations = recommendations.slice(0, 3);

    console.log(`🎯 Found ${topRecommendations.length} top matches in milliseconds!`);
    
    res.json({ recommendations: topRecommendations });

  } catch (err) {
    console.error('❌ Matching error:', err);
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
    console.log('🦙 Ollama: Make sure Ollama is running on http://localhost:11434');
    console.log('   Run: ollama serve');
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