import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __rootDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__rootDir, '.env') });

console.log('Current working directory:', process.cwd());
import cors from 'cors';
import { sequelize, connectDatabase } from './config/database.js';
import {
  ensureAuthSchemaMysql,
  ensureAchievementEventTableMysql,
  ensureEventRegistrationTableMysql,
  ensureEventsExtraColumnsMysql,
  ensureCatFosterColumnsMysql,
  ensureAdoptionRequestFosterColumnsMysql,
  ensureShelterNeedSchemaMysql,
} from './config/ensureAuthSchema.js';
import { ensureDemoShelterNeeds } from './config/ensureDemoShelterNeeds.js';
import catsRouter from './routes/cats.js';
import shelterRouter from './routes/shelter.js';
import authRouter from './routes/auth.js';
import achievementsRouter from './routes/achievements.js';
import { redeemMarketplaceDiscount } from './controllers/achievementsController.js';
import { deleteSentFosterRequest } from './controllers/catController.js';
import needsRouter from './routes/needs.js';
import eventsRouter from './routes/events.js';

import './models/Cat.js';
import './models/BasicUser.js';
import './models/Shelter.js';
import './models/Vaccination.js';
import './models/AchievementEvent.js';
import './models/Need.js';
import './models/Event.js';
import './models/EventRegistration.js';
import './models/AdoptionRequest.js';

import usersRouter from './routes/users.js';
import { logAiStartupHints, queryMusya } from './services/aiChat.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const clientDistPath = path.join(__rootDir, 'client', 'dist');
app.use(express.static(clientDistPath));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__rootDir, 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
/** Remove sent application (explicit route for stale server processes / proxies). */
app.delete('/api/cats/foster-requests/:requestId', deleteSentFosterRequest);
app.use('/api/cats', catsRouter);
app.use('/api/shelter', shelterRouter);
app.use('/api/achievements', achievementsRouter);
/** Discounts page: explicit POST so redeem works even if nested `/api/achievements/:id/redeem` is missing (stale process / proxy). */
app.post('/api/marketplace/redeem', redeemMarketplaceDiscount);
app.use('/api/needs', needsRouter);
app.use('/api/events', eventsRouter);

const MUSYA_SYSTEM_PROMPT = `You are Musya, a warm and friendly AI cat expert who genuinely loves cats! 🐱 You're here to have natural conversations about feline friends and give helpful advice.

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

app.post('/api/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ reply: 'Message is required.' });
  }

  try {
    const reply = await queryMusya(message, MUSYA_SYSTEM_PROMPT);
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    const hint =
      err.message ||
      "⚠️ AI is not configured. Set OPENAI_API_KEY in .env, or install Ollama (https://ollama.com). 🐱";
    res.status(503).json({ reply: hint });
  }
});

const toPublicImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith('/')) {
    return `${req.protocol}://${req.get('host')}${imageUrl}`;
  }
  return imageUrl;
};

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

      const publicImage = toPublicImageUrl(catData.imageUrl || catData.image_url, req);

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
          imageUrl: publicImage,
          image_url: publicImage,
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

// Fallback to frontend routing for all non-API requests.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

async function start() {
  try {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = Number(process.env.DB_PORT) || 3306;
    const dbName = (process.env.DB_NAME || '').trim();
    console.log(`Trying MySQL at ${dbHost}:${dbPort} / ${dbName || '(no DB_NAME)'} …`);
    await connectDatabase();
    console.log(`MySQL connection OK (${dbHost}:${dbPort} / ${dbName}).`);
    /** alter=true repeatedly adds duplicate UNIQUE indexes on basic_user (MySQL max 64 keys). */
    const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true';
    console.log(`Sequelize sync (alter=${shouldAlterSchema})…`);
    await sequelize.sync({ alter: shouldAlterSchema });
    await ensureAuthSchemaMysql();
    await ensureAchievementEventTableMysql();
    await ensureEventRegistrationTableMysql();
    await ensureEventsExtraColumnsMysql();
    await ensureCatFosterColumnsMysql();
    await ensureAdoptionRequestFosterColumnsMysql();
    await ensureShelterNeedSchemaMysql();
    await ensureDemoShelterNeeds();
    logAiStartupHints();
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
      const triedHost = process.env.DB_HOST || 'localhost';
      const triedPort = Number(process.env.DB_PORT) || 3306;
      const triedDb = (process.env.DB_NAME || '').trim();
      console.error(
        `Cannot connect to MySQL (connection refused) at ${triedHost}:${triedPort} / ${triedDb || '?'}.`,
      );
      console.error(
        '1) Start the MySQL80 Windows service (services.msc). 2) Match DB_PORT to Workbench (often 3306 or 3307).',
      );
      console.error(
        '3) On Windows use DB_HOST=127.0.0.1 instead of localhost if you still see ECONNREFUSED.',
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