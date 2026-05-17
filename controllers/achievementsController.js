import crypto from 'crypto';
import { sequelize } from '../config/database.js';
import { BasicUser } from '../models/BasicUser.js';
import { AchievementEvent } from '../models/AchievementEvent.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';

/** Must match `discounts` on MarketplacePage (partner + points). */
const MARKETPLACE_OFFERS = [
  { partner: 'MasterZoo', points: 500 },
  { partner: 'Vet Clinic "Healthy Cat"', points: 1000 },
  { partner: 'PetShop "Murkosha"', points: 800 },
  { partner: 'Cat Hotel "Magic Home"', points: 1200 },
  { partner: 'Photo Studio "Fluffy"', points: 600 },
];

const DEFINITIONS = [
  { type: 'CAT_PROFILE_CREATED', title: 'Cat profile created', points: 50, repeat: 'once_per_cat' },
  { type: 'VACCINATION_FIRST', title: 'Medical record started (first vaccination)', points: 150, repeat: 'once_per_cat' },
  { type: 'VACCINATION_NEXT', title: 'Each additional vaccination', points: 100, repeat: 'repeatable' },
  { type: 'AI_CHAT_FIRST', title: 'First chat with the AI assistant', points: 20, repeat: 'once' },
  { type: 'FEEDING_DAILY', title: 'Feeding check-in', points: 5, repeat: 'daily' },
  { type: 'SHARE_STORY', title: 'Share a story on social media', points: 50, repeat: 'once' },
  { type: 'REFERRAL_REGISTERED', title: 'Friend registered via your link', points: 100, repeat: 'repeatable' },
  { type: 'WEIGHT_MONTHLY', title: "Update cat's weight", points: 10, repeat: 'monthly' },
  { type: 'CAT_PROFILE_COMPLETED', title: 'Add photo, breed, age, and personality', points: 40, repeat: 'once_per_cat' },
  { type: 'GAMES_DAILY', title: '15 minutes of active play', points: 15, repeat: 'daily' },
  { type: 'GROOMING_WEEKLY', title: 'Brushing / ear & teeth care', points: 30, repeat: 'weekly' },
];

function cooldownFor(defType) {
  if (defType === ACHIEVEMENT_TYPES.FEEDING_DAILY) return 'daily';
  if (defType === ACHIEVEMENT_TYPES.GAMES_DAILY) return 'daily';
  if (defType === ACHIEVEMENT_TYPES.GROOMING_WEEKLY) return 'weekly';
  if (defType === ACHIEVEMENT_TYPES.WEIGHT_MONTHLY) return 'monthly';
  return null;
}

function normalizeType(type) {
  return typeof type === 'string' ? type.trim().toUpperCase() : '';
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function monthsBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    db.getFullYear() * 12 + db.getMonth() - (da.getFullYear() * 12 + da.getMonth())
  );
}

function eligibleNow(def, lastAt) {
  if (!lastAt) return true;

  const now = new Date();
  const last = new Date(lastAt);

  if (def.repeat === 'once') return false;
  if (def.repeat === 'once_per_cat') return false;

  if (def.repeat === 'daily') return daysBetween(last, now) >= 1;
  if (def.repeat === 'weekly') return daysBetween(last, now) >= 7;
  if (def.repeat === 'monthly') return monthsBetween(last, now) >= 1;

  return true;
}

export async function getAchievementsSummary(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await BasicUser.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pointsBalance = Number(user.points) || 0;
    const redeemEvents = await AchievementEvent.findAll({
      where: { userId, type: 'DISCOUNT_REDEEM' },
      attributes: ['meta'],
    });
    let pointsRedeemedLifetime = 0;
    for (const row of redeemEvents) {
      let meta = row.get ? row.get('meta') : row.meta;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = null;
        }
      }
      const cost = meta && typeof meta === 'object' ? Number(meta.cost) : NaN;
      if (Number.isFinite(cost) && cost > 0) {
        pointsRedeemedLifetime += cost;
      }
    }
    const sumAwardedFromEvents =
      Number(
        await AchievementEvent.sum('points', {
          where: { userId },
        }),
      ) || 0;
    const pointsLifetime = Math.max(
      pointsBalance + pointsRedeemedLifetime,
      sumAwardedFromEvents,
    );

    const events = await AchievementEvent.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const completedByType = events.reduce((acc, e) => {
      const t = e.type;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const lastEventAtByType = events.reduce((acc, e) => {
      if (!acc[e.type]) {
        acc[e.type] = e.created_at || e.createdAt || null;
      }
      return acc;
    }, {});

    const statusByType = DEFINITIONS.reduce((acc, def) => {
      const doneCount = Number(completedByType[def.type] || 0);
      const lastAt = lastEventAtByType[def.type] || null;

      const isDone =
        def.repeat === 'daily' || def.repeat === 'weekly' || def.repeat === 'monthly'
          ? Boolean(lastAt) && !eligibleNow(def, lastAt)
          : doneCount > 0;

      acc[def.type] = {
        doneCount,
        lastAt,
        isDone,
        eligibleNow: eligibleNow(def, lastAt),
      };
      return acc;
    }, {});

    return res.json({
      userId,
      points: pointsBalance,
      pointsLifetime,
      definitions: DEFINITIONS,
      completedByType,
      lastEventAtByType,
      statusByType,
      recentEvents: events.slice(0, 30),
    });
  } catch (err) {
    next(err);
  }
}

export async function claimAchievement(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await BasicUser.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const type = normalizeType(req.body?.type);
    const catIdRaw = req.body?.catId;
    const catId = catIdRaw === null || catIdRaw === undefined || catIdRaw === '' ? null : Number(catIdRaw);

    const def = DEFINITIONS.find((d) => d.type === type);
    if (!def) {
      return res.status(400).json({ message: 'Unknown achievement type' });
    }

    const isOnce = def.repeat === 'once';
    const isOncePerCat = def.repeat === 'once_per_cat';
    const allowDuplicate = !(isOnce || isOncePerCat);

    if (isOncePerCat && (!Number.isInteger(catId) || catId <= 0)) {
      return res.status(400).json({ message: 'catId is required for this achievement' });
    }

    const cooldown = cooldownFor(type);

    const result = await awardPoints({
      userId,
      type,
      points: def.points,
      catId: isOncePerCat ? catId : null,
      meta: req.body?.meta || {},
      allowDuplicate,
      cooldown,
    });

    if (!result.awarded) {
      return res.status(409).json({ message: 'Not eligible', reason: result.reason });
    }

    const updated = await BasicUser.findByPk(userId);

    return res.status(201).json({
      message: 'Achievement claimed',
      event: result.event,
      points: updated?.points || 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function redeemMarketplaceDiscount(req, res, next) {
  try {
    const fromParam = Number(req.params?.userId);
    const fromBody = Number(req.body?.userId);
    const userId =
      Number.isInteger(fromParam) && fromParam > 0 ? fromParam : fromBody;
    const partnerName =
      typeof req.body?.partner_name === 'string' ? req.body.partner_name.trim() : '';
    const cost = Number(req.body?.points);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (!partnerName) {
      return res.status(400).json({ message: 'partner_name is required' });
    }
    if (!Number.isInteger(cost) || cost <= 0) {
      return res.status(400).json({ message: 'Invalid points amount' });
    }

    const offer = MARKETPLACE_OFFERS.find(
      (o) => o.partner === partnerName && o.points === cost
    );
    if (!offer) {
      return res.status(400).json({ message: 'Unknown offer' });
    }

    const user = await BasicUser.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const current = Number(user.points) || 0;
    if (current < cost) {
      return res.status(400).json({ message: 'Not enough points' });
    }

    const promoCode = `MUSYA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let newBalance = current - cost;

    await sequelize.transaction(async (t) => {
      const locked = await BasicUser.findByPk(userId, {
        transaction: t,
        lock: true,
      });
      if (!locked) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      const bal = Number(locked.points) || 0;
      if (bal < cost) {
        const err = new Error('Not enough points');
        err.statusCode = 400;
        throw err;
      }
      newBalance = bal - cost;
      await locked.update({ points: newBalance }, { transaction: t });

      await AchievementEvent.create(
        {
          userId,
          catId: null,
          type: 'DISCOUNT_REDEEM',
          points: 0,
          meta: { partner: partnerName, cost, promo_code: promoCode },
        },
        { transaction: t }
      );
    });

    return res.json({
      promo_code: promoCode,
      new_balance: newBalance,
    });
  } catch (err) {
    const code = err.statusCode;
    if (code === 400 || code === 404) {
      return res.status(code).json({ message: err.message });
    }
    console.error('[achievements/redeem]', err?.parent?.sqlMessage || err?.message || err);
    next(err);
  }
}
