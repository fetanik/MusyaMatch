import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Need } from '../models/Need.js';
import { Shelter } from '../models/Shelter.js';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const STATUSES = new Set(['open', 'fulfilled']);

const todayLocalYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseYmd = (raw) => {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
};

/** Open needs past due_date are inactive and excluded from listings. */
const activeNeedVisibilitySql = () =>
  sequelize.literal(
    "(`Need`.`status` <> 'open' OR `Need`.`due_date` IS NULL OR `Need`.`due_date` >= CURDATE())"
  );

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

const serializeNeed = async (needInstance) => {
  const need = typeof needInstance?.toJSON === 'function' ? needInstance.toJSON() : needInstance;
  if (!need?.shelterId) {
    return need;
  }

  const shelter = await Shelter.findByPk(need.shelterId, {
    attributes: ['id', 'name', 'phone', 'address'],
  });

  return {
    ...need,
    shelter: shelter ? shelter.toJSON() : null,
  };
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

    const scopeParts = [];
    if (Object.keys(where).length) {
      scopeParts.push(where);
    }
    scopeParts.push(activeNeedVisibilitySql());

    const needs = await Need.findAll({
      where: { [Op.and]: scopeParts },
      order: [['createdAt', 'DESC']],
    });

    const serialized = await Promise.all(needs.map((need) => serializeNeed(need)));
    return res.json(serialized);
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
    const dueDateRaw = req.body.dueDate ?? req.body.due_date;
    const dueDate = parseYmd(dueDateRaw);

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!dueDate) {
      return res.status(400).json({ message: 'Due date is required (YYYY-MM-DD)' });
    }

    if (status === 'open' && dueDate < todayLocalYmd()) {
      return res.status(400).json({ message: 'Due date cannot be in the past for an open need' });
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
      dueDate,
    });

    const serialized = await serializeNeed(need);
    return res.status(201).json(serialized);
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

    let dueDate = need.dueDate;
    const hasDueInput = req.body.dueDate !== undefined || req.body.due_date !== undefined;
    if (hasDueInput) {
      const raw = req.body.dueDate ?? req.body.due_date;
      if (raw === null || String(raw).trim() === '') {
        if (status === 'open') {
          return res.status(400).json({ message: 'Due date is required for open needs' });
        }
        dueDate = null;
      } else {
        const parsed = parseYmd(String(raw));
        if (!parsed) {
          return res.status(400).json({ message: 'Due date must be YYYY-MM-DD' });
        }
        dueDate = parsed;
      }
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!PRIORITIES.has(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high' });
    }

    if (!STATUSES.has(status)) {
      return res.status(400).json({ message: 'Status must be open or fulfilled' });
    }

    if (status === 'open' && dueDate && dueDate < todayLocalYmd()) {
      return res.status(400).json({ message: 'Due date cannot be in the past for an open need' });
    }

    await need.update({
      title,
      description,
      category,
      priority,
      status,
      dueDate,
    });

    const serialized = await serializeNeed(need);
    return res.json(serialized);
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
