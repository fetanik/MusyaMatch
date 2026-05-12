import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { BasicUser } from '../models/BasicUser.js';
import { AchievementEvent } from '../models/AchievementEvent.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';

const DEFINITIONS = [
  { type: 'CAT_PROFILE_CREATED', title: 'Реєстрація профілю кота', points: 50, repeat: 'once_per_cat' },
  { type: 'VACCINATION_FIRST', title: 'Заповнення медичної карти (перше щеплення)', points: 150, repeat: 'once_per_cat' },
  { type: 'VACCINATION_NEXT', title: 'Кожне наступне щеплення', points: 100, repeat: 'repeatable' },
  { type: 'AI_CHAT_FIRST', title: 'Перший чат з AI-помічником', points: 20, repeat: 'once' },
  { type: 'FEEDING_DAILY', title: 'Відмітка про годування', points: 5, repeat: 'daily' },
  { type: 'SHARE_STORY', title: 'Поділитися історією в соцмережах', points: 50, repeat: 'once' },
  { type: 'REFERRAL_REGISTERED', title: 'Друг зареєструвався за посиланням', points: 100, repeat: 'repeatable' },
  { type: 'WEIGHT_MONTHLY', title: 'Оновити вагу кота', points: 10, repeat: 'monthly' },
  { type: 'CAT_PROFILE_COMPLETED', title: 'Додати фото, породу, вік та характер', points: 40, repeat: 'once_per_cat' },
  { type: 'GAMES_DAILY', title: '15 хвилин активних ігор', points: 15, repeat: 'daily' },
  { type: 'GROOMING_WEEKLY', title: 'Вичісування/чистка вушок/зубів', points: 30, repeat: 'weekly' },
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

    const balanceRow = await AchievementEvent.findOne({
      where: { userId },
      attributes: [[sequelize.fn('SUM', sequelize.col('points')), 'totalPoints']],
      raw: true,
    });
    const pointsFromEvents = Number(balanceRow?.totalPoints || 0);

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
      points: pointsFromEvents,
      legacyUserPoints: user.points || 0,
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

export async function redeemDiscount(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await BasicUser.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { partnerName, points: redeemPoints } = req.body;
    if (!partnerName || !Number.isInteger(redeemPoints) || redeemPoints <= 0) {
      return res.status(400).json({ message: 'Invalid partnerName or points' });
    }

    // Calculate current balance (sum all points from achievement_event)
    const events = await AchievementEvent.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('points')), 'totalPoints']
      ],
      raw: true,
    });

    const currentBalance = Number(events[0]?.totalPoints || 0);

    // Check if user has enough points
    if (currentBalance < redeemPoints) {
      return res.status(400).json({
        message: 'Not enough points',
        currentBalance,
        required: redeemPoints,
      });
    }

    // Generate promo code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const promoCode = 'MUSYA' + Array.from({ length: 4 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Create redemption event
    const redemptionEvent = await AchievementEvent.create({
      userId,
      type: 'REDEEM_DISCOUNT',
      points: -redeemPoints,
      meta: {
        partnerName,
        promoCode,
      },
    });

    const newBalance = currentBalance - redeemPoints;

    return res.status(201).json({
      message: 'Discount redeemed successfully',
      event: redemptionEvent,
      promoCode,
      newBalance,
    });
  } catch (err) {
    next(err);
  }
}

function normalizePartnerName(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

function generatePromoCode() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `MUSYA${new Date().getFullYear()}${suffix}`;
}

export async function redeemDiscountV2(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const userId = Number(req.body?.userId);
    const partnerName = normalizePartnerName(req.body?.partner_name || req.body?.partnerName);
    const redeemPointsRaw = req.body?.points ?? req.body?.redeem_points ?? req.body?.redeemPoints;
    const redeemPoints = Number(redeemPointsRaw);

    if (!Number.isInteger(userId) || userId <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (!partnerName || !Number.isFinite(redeemPoints) || !Number.isInteger(redeemPoints) || redeemPoints <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid partner_name or points' });
    }

    const user = await BasicUser.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const balanceRow = await AchievementEvent.findOne({
      where: { userId },
      attributes: [[sequelize.fn('SUM', sequelize.col('points')), 'totalPoints']],
      raw: true,
      transaction: t,
    });
    const currentBalance = Number(balanceRow?.totalPoints || 0);

    if (currentBalance < redeemPoints) {
      await t.rollback();
      return res.status(400).json({
        message: 'Not enough points',
        current_balance: currentBalance,
        required: redeemPoints,
      });
    }

    const promoCode = generatePromoCode();

    const redemptionEvent = await AchievementEvent.create(
      {
        userId,
        type: 'redeem_discount',
        points: -redeemPoints,
        meta: {
          partner_name: partnerName,
          promo_code: promoCode,
        },
      },
      { transaction: t }
    );

    const newBalance = currentBalance - redeemPoints;
    if (newBalance < 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Balance cannot be negative' });
    }

    await t.commit();
    return res.status(201).json({
      message: 'Discount redeemed successfully',
      event: redemptionEvent,
      promo_code: promoCode,
      new_balance: newBalance,
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch {
      // ignore
    }
    next(err);
  }
}

