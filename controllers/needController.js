import { Need } from '../models/Need.js';
import { Shelter } from '../models/Shelter.js';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const STATUSES = new Set(['open', 'fulfilled']);

const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return parsed;
};

const resolveShelterId = async (rawShelterId, rawUserId) => {
  const shelterId = toOptionalPositiveInt(rawShelterId);
  const userId = toOptionalPositiveInt(rawUserId);

  if (shelterId) {
    return { shelterId, userId };
  }

  if (userId) {
    const shelter = await Shelter.findOne({
      where: { userId },
      attributes: ['id'],
    });

    if (shelter?.id) {
      return { shelterId: shelter.id, userId };
    }
  }

  return { shelterId: null, userId };
};

export async function getNeeds(req, res, next) {
  try {
    const { shelterId, userId } = await resolveShelterId(req.query.shelterId, req.query.userId);
    const where = {};

    if (shelterId) {
      where.shelterId = shelterId;
    } else if (userId) {
      where.userId = userId;
    }

    const needs = await Need.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return res.json(needs);
  } catch (err) {
    return next(err);
  }
}

export async function createNeed(req, res, next) {
  try {
    const { shelterId, userId } = await resolveShelterId(req.body.shelterId, req.body.userId);
    const title = req.body.title?.trim();
    const description = req.body.description?.trim() || null;
    const category = req.body.category?.trim() || 'General';
    const priority = req.body.priority?.trim()?.toLowerCase() || 'medium';
    const status = req.body.status?.trim()?.toLowerCase() || 'open';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!PRIORITIES.has(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    if (!STATUSES.has(status)) {
      return res.status(400).json({ message: 'Status must be open or fulfilled' });
    }

    const need = await Need.create({
      shelterId,
      userId,
      title,
      description,
      category,
      priority,
      status,
    });

    return res.status(201).json(need);
  } catch (err) {
    return next(err);
  }
}

export async function updateNeed(req, res, next) {
  try {
    const { id } = req.params;
    const need = await Need.findByPk(id);

    if (!need) {
      return res.status(404).json({ message: 'Need not found' });
    }

    const title = req.body.title?.trim();
    const description =
      req.body.description !== undefined ? req.body.description?.trim() || null : need.description;
    const category = req.body.category?.trim() || need.category;
    const priority = req.body.priority?.trim()?.toLowerCase() || need.priority;
    const status = req.body.status?.trim()?.toLowerCase() || need.status;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!PRIORITIES.has(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    if (!STATUSES.has(status)) {
      return res.status(400).json({ message: 'Status must be open or fulfilled' });
    }

    await need.update({
      title,
      description,
      category,
      priority,
      status,
    });

    return res.json(need);
  } catch (err) {
    return next(err);
  }
}

export async function deleteNeed(req, res, next) {
  try {
    const { id } = req.params;
    const need = await Need.findByPk(id);

    if (!need) {
      return res.status(404).json({ message: 'Need not found' });
    }

    await need.destroy();

    return res.json({ message: 'Need deleted successfully' });
  } catch (err) {
    return next(err);
  }
}
