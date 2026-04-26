import { Cat } from '../models/Cat.js';
import { cloudinary } from '../config/cloudinary.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';
import { AchievementEvent } from '../models/AchievementEvent.js';

function uploadBufferToCloudinary(fileBuffer, folder = 'musyamatch/cats') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

const normalizeVaccinations = (vaccinations) => {
  if (!Array.isArray(vaccinations)) return [];

  return vaccinations
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const parseVaccinationsInput = (vaccinations) => {
  if (Array.isArray(vaccinations)) {
    return normalizeVaccinations(vaccinations);
  }

  if (typeof vaccinations === 'string') {
    const trimmed = vaccinations.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeVaccinations(parsed);
      }
    } catch {
      return normalizeVaccinations(trimmed.split(','));
    }
  }

  return [];
};

function isCatProfileComplete(cat) {
  const hasPhoto = Boolean(cat.image_url);
  const hasBreed = Boolean(cat.breed);
  const hasAge = cat.age !== null && cat.age !== undefined && cat.age !== '';
  const hasPersonality = Boolean(cat.personality);
  return hasPhoto && hasBreed && hasAge && hasPersonality;
}

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
      age,
      source,
      urgency,
      personality,
      sex,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let imageUrl = req.body.image_url || req.body.imageUrl || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    const cat = await Cat.create({
      shelterId: shelterId ?? null,
      userId: userId ?? null,
      name: name.trim(),
      breed: breed?.trim() || null,
      gender: gender || null,
      birthDate: birthDate || null,
      age: age ? Number(age) : null,
      description: description?.trim() || null,
      vaccinations: parseVaccinationsInput(vaccinations),
      image_url: imageUrl,
      source: source?.trim()?.toLowerCase() || 'shelter',
      urgency: urgency?.trim()?.toLowerCase() || null,
      personality: personality?.trim() || null,
      sex: sex?.trim()?.toLowerCase() || null,
      sourceType: sourceType || 'shelter',
      listingType: listingType || 'adoption',
      listingStatus: listingStatus || 'active',
    });

    if (cat.userId) {
      await awardPoints({
        userId: cat.userId,
        type: ACHIEVEMENT_TYPES.CAT_PROFILE_CREATED,
        points: 50,
        catId: cat.id,
        meta: { catName: cat.name },
        allowDuplicate: false,
      });

      if (isCatProfileComplete(cat)) {
        await awardPoints({
          userId: cat.userId,
          type: ACHIEVEMENT_TYPES.CAT_PROFILE_COMPLETED,
          points: 40,
          catId: cat.id,
          meta: { catName: cat.name },
          allowDuplicate: false,
        });
      }
    }

    return res.status(201).json(cat);
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
      age,
      source,
      urgency,
      personality,
      sex,
    } = req.body;

    const cat = await Cat.findByPk(id);

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    let imageUrl = cat.image_url;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    } else if (req.body.image_url || req.body.imageUrl) {
      imageUrl = req.body.image_url || req.body.imageUrl;
    }

    await cat.update({
      shelterId: shelterId !== undefined ? shelterId : cat.shelterId,
      userId: userId !== undefined ? userId : cat.userId,
      name: name !== undefined ? (name?.trim() || cat.name) : cat.name,
      breed: breed !== undefined ? (breed?.trim() || null) : cat.breed,
      gender: gender !== undefined ? (gender || null) : cat.gender,
      birthDate: birthDate !== undefined ? (birthDate || null) : cat.birthDate,
      age: age !== undefined ? (age ? Number(age) : null) : cat.age,
      description:
        description !== undefined ? (description?.trim() || null) : cat.description,
      vaccinations:
        vaccinations !== undefined
          ? parseVaccinationsInput(vaccinations)
          : cat.vaccinations,
      image_url: imageUrl,
      source: source !== undefined ? (source?.trim()?.toLowerCase() || 'shelter') : cat.source,
      urgency: urgency !== undefined ? (urgency?.trim()?.toLowerCase() || null) : cat.urgency,
      personality:
        personality !== undefined ? (personality?.trim() || null) : cat.personality,
      sex: sex !== undefined ? (sex?.trim()?.toLowerCase() || null) : cat.sex,
      sourceType: sourceType || cat.sourceType,
      listingType: listingType || cat.listingType,
      listingStatus: listingStatus || cat.listingStatus,
    });

    if (cat.userId && isCatProfileComplete(cat)) {
      const already = await AchievementEvent.findOne({
        where: {
          userId: cat.userId,
          catId: cat.id,
          type: ACHIEVEMENT_TYPES.CAT_PROFILE_COMPLETED,
        },
      });

      if (!already) {
        await awardPoints({
          userId: cat.userId,
          type: ACHIEVEMENT_TYPES.CAT_PROFILE_COMPLETED,
          points: 40,
          catId: cat.id,
          meta: { catName: cat.name },
          allowDuplicate: false,
        });
      }
    }

    return res.json(cat);
  } catch (err) {
    next(err);
  }
}

export async function createFosterRequest(req, res, next) {
  try {
    const catId = Number(req.params.id);

    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }

    const cat = await Cat.findByPk(catId);
    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    return res.status(202).json({
      message: 'Foster request accepted (stub). We will contact you soon.',
      catId: cat.id,
    });
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
