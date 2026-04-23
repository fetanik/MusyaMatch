import { Cat } from '../models/Cat.js';

const normalizeVaccinations = (vaccinations) => {
  if (!Array.isArray(vaccinations)) return [];

  return vaccinations
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

export async function getCats(req, res, next) {
  try {
    const cats = await Cat.findAll({
      order: [['id', 'DESC']],
    });

    res.json(cats);
  } catch (err) {
    next(err);
  }
}

export async function getCatById(req, res, next) {
  try {
    const { id } = req.params;

    const cat = await Cat.findByPk(id);

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    res.json(cat);
  } catch (err) {
    next(err);
  }
}

export async function createCat(req, res, next) {
  try {
    const {
      shelterId,
      userId,
      name,
      breed,
      gender,
      birthDate,
      description,
      vaccinations,
      sourceType,
      listingType,
      listingStatus,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const cat = await Cat.create({
      shelterId: shelterId ?? null,
      userId: userId ?? null,
      name: name.trim(),
      breed: breed?.trim() || null,
      gender: gender || null,
      birthDate: birthDate || null,
      description: description?.trim() || null,
      vaccinations: normalizeVaccinations(vaccinations),
      sourceType: sourceType || 'shelter',
      listingType: listingType || 'adoption',
      listingStatus: listingStatus || 'active',
    });

    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
}

export async function updateCat(req, res, next) {
  try {
    const { id } = req.params;
    const {
      shelterId,
      userId,
      name,
      breed,
      gender,
      birthDate,
      description,
      vaccinations,
      sourceType,
      listingType,
      listingStatus,
    } = req.body;

    const cat = await Cat.findByPk(id);

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    await cat.update({
      shelterId: shelterId !== undefined ? shelterId : cat.shelterId,
      userId: userId !== undefined ? userId : cat.userId,
      name: name !== undefined ? (name?.trim() || cat.name) : cat.name,
      breed: breed !== undefined ? (breed?.trim() || null) : cat.breed,
      gender: gender !== undefined ? (gender || null) : cat.gender,
      birthDate: birthDate !== undefined ? (birthDate || null) : cat.birthDate,
      description:
        description !== undefined ? (description?.trim() || null) : cat.description,
      vaccinations:
        vaccinations !== undefined
          ? normalizeVaccinations(vaccinations)
          : cat.vaccinations,
      sourceType: sourceType || cat.sourceType,
      listingType: listingType || cat.listingType,
      listingStatus: listingStatus || cat.listingStatus,
    });

    res.json(cat);
  } catch (err) {
    next(err);
  }
}

export async function deleteCat(req, res, next) {
  try {
    const { id } = req.params;

    const cat = await Cat.findByPk(id);

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    await cat.destroy();

    res.json({ message: 'Cat deleted successfully' });
  } catch (err) {
    next(err);
  }
}