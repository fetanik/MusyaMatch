import { Vaccination } from '../models/Vaccination.js';
import { Cat } from '../models/Cat.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';

async function ensureCatExists(catId) {
  const cat = await Cat.findByPk(catId);
  return Boolean(cat);
}

export async function listVaccinations(req, res, next) {
  try {
    const catId = Number(req.params.catId);
    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }

    const exists = await ensureCatExists(catId);
    if (!exists) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    const items = await Vaccination.findAll({
      where: { catId },
      order: [
        ['dueDate', 'ASC'],
        ['id', 'DESC'],
      ],
    });

    return res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function createVaccination(req, res, next) {
  try {
    const catId = Number(req.params.catId);
    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }

    const cat = await Cat.findByPk(catId);
    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    const { name, dueDate, status, notes } = req.body || {};

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Vaccination name is required' });
    }

    const normalizedStatus =
      status === 'completed' || status === 'upcoming' ? status : 'upcoming';

    const existingCount = await Vaccination.count({ where: { catId } });

    const item = await Vaccination.create({
      catId,
      name: name.trim(),
      dueDate: dueDate || null,
      status: normalizedStatus,
      notes: notes?.trim() || null,
    });

    if (cat.userId) {
      const isFirst = existingCount === 0;
      await awardPoints({
        userId: cat.userId,
        type: isFirst ? ACHIEVEMENT_TYPES.VACCINATION_FIRST : ACHIEVEMENT_TYPES.VACCINATION_NEXT,
        points: isFirst ? 150 : 100,
        catId: cat.id,
        meta: { vaccinationName: item.name, dueDate: item.dueDate },
        allowDuplicate: !isFirst,
      });
    }

    return res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function updateVaccination(req, res, next) {
  try {
    const catId = Number(req.params.catId);
    const vaccinationId = Number(req.params.vaccinationId);

    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }
    if (!Number.isInteger(vaccinationId) || vaccinationId <= 0) {
      return res.status(400).json({ message: 'Invalid vaccination id' });
    }

    const item = await Vaccination.findOne({
      where: { id: vaccinationId, catId },
    });

    if (!item) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    const { name, dueDate, status, notes } = req.body || {};

    await item.update({
      name: name !== undefined ? (name?.trim() || item.name) : item.name,
      dueDate: dueDate !== undefined ? (dueDate || null) : item.dueDate,
      status:
        status !== undefined
          ? status === 'completed' || status === 'upcoming'
            ? status
            : item.status
          : item.status,
      notes: notes !== undefined ? (notes?.trim() || null) : item.notes,
    });

    return res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function deleteVaccination(req, res, next) {
  try {
    const catId = Number(req.params.catId);
    const vaccinationId = Number(req.params.vaccinationId);

    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }
    if (!Number.isInteger(vaccinationId) || vaccinationId <= 0) {
      return res.status(400).json({ message: 'Invalid vaccination id' });
    }

    const item = await Vaccination.findOne({
      where: { id: vaccinationId, catId },
    });

    if (!item) {
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    await item.destroy();
    return res.json({ message: 'Vaccination deleted' });
  } catch (err) {
    next(err);
  }
}

