import { AchievementEvent } from '../models/AchievementEvent.js';
import { BasicUser } from '../models/BasicUser.js';

export const ACHIEVEMENT_TYPES = {
  CAT_PROFILE_CREATED: 'CAT_PROFILE_CREATED',
  CAT_PROFILE_COMPLETED: 'CAT_PROFILE_COMPLETED',
  VACCINATION_FIRST: 'VACCINATION_FIRST',
  VACCINATION_NEXT: 'VACCINATION_NEXT',
  AI_CHAT_FIRST: 'AI_CHAT_FIRST',
  FEEDING_DAILY: 'FEEDING_DAILY',
  SHARE_STORY: 'SHARE_STORY',
  REFERRAL_REGISTERED: 'REFERRAL_REGISTERED',
  WEIGHT_MONTHLY: 'WEIGHT_MONTHLY',
  GAMES_DAILY: 'GAMES_DAILY',
  GROOMING_WEEKLY: 'GROOMING_WEEKLY',
};

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
  return db.getFullYear() * 12 + db.getMonth() - (da.getFullYear() * 12 + da.getMonth());
}

export async function awardPoints({
  userId,
  type,
  points,
  catId = null,
  meta = {},
  allowDuplicate = true,
  cooldown,
}) {
  if (!userId || !type || !Number.isFinite(points)) {
    return { awarded: false, reason: 'invalid_input' };
  }

  const where = { userId, type };
  if (catId !== undefined) where.catId = catId;

  const last = await AchievementEvent.findOne({
    where,
    order: [['created_at', 'DESC']],
  });

  if (!allowDuplicate && last) {
    return { awarded: false, reason: 'already_awarded' };
  }

  if (cooldown && last) {
    const now = new Date();
    const lastAt = new Date(last.created_at || last.createdAt || last.get?.('created_at'));

    if (cooldown === 'daily' && daysBetween(lastAt, now) < 1) {
      return { awarded: false, reason: 'cooldown_daily' };
    }
    if (cooldown === 'weekly' && daysBetween(lastAt, now) < 7) {
      return { awarded: false, reason: 'cooldown_weekly' };
    }
    if (cooldown === 'monthly' && monthsBetween(lastAt, now) < 1) {
      return { awarded: false, reason: 'cooldown_monthly' };
    }
  }

  const event = await AchievementEvent.create({
    userId,
    catId: catId ?? null,
    type,
    points,
    meta,
  });

  await BasicUser.increment({ points }, { where: { id: userId } });

  return { awarded: true, event };
}

