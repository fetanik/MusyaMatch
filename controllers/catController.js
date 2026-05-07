import { Cat } from '../models/Cat.js';
import { cloudinary } from '../config/cloudinary.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';
import { AchievementEvent } from '../models/AchievementEvent.js';
import { Shelter } from '../models/Shelter.js';
import { AdoptionRequest } from '../models/AdoptionRequest.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const toPublicImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith('/')) {
    return `${req.protocol}://${req.get('host')}${imageUrl}`;
  }
  return imageUrl;
};

const serializeCat = (cat, req) => {
  const raw = typeof cat?.toJSON === 'function' ? cat.toJSON() : cat;
  return {
    ...raw,
    image_url: toPublicImageUrl(raw?.image_url, req),
  };
};

const saveBufferToLocalUploads = async (file) => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  const originalExt = path.extname(file.originalname || '').toLowerCase();
  const fallbackExt = file.mimetype === 'image/png' ? '.png' : '.jpg';
  const extension = originalExt || fallbackExt;
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const absolutePath = path.join(uploadsDir, filename);

  await fs.writeFile(absolutePath, file.buffer);
  return `/uploads/${filename}`;
};

const normalizeVaccinations = (vaccinations) => {
  if (Array.isArray(vaccinations)) {
    return vaccinations
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof vaccinations === 'string') {
    const trimmed = vaccinations.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
    } catch {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};


const normalizeNullableInt = (value) => {
  if (value === undefined || value === null || value === '' || value === 'null') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return parsed;
};

export async function getCats(req, res, next) {
  try {
    const cats = await Cat.findAll({
      order: [['id', 'DESC']],
    });

    res.json(cats.map((cat) => serializeCat(cat, req)));
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

    res.json(serializeCat(cat, req));
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

    const normalizedUserId = toOptionalPositiveInt(userId);
    let normalizedShelterId = toOptionalPositiveInt(shelterId);

    if (!normalizedShelterId && normalizedUserId) {
      const shelter = await Shelter.findOne({
        where: { userId: normalizedUserId },
        attributes: ['id'],
      });
      normalizedShelterId = shelter?.id || null;
    }

    let imageUrl = req.body.image_url || req.body.imageUrl || null;
    if (req.file) {
      if (hasCloudinaryConfig()) {
        try {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
          imageUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload failed, falling back to local uploads:', uploadError);
          imageUrl = await saveBufferToLocalUploads(req.file);
        }
      } else {
        imageUrl = await saveBufferToLocalUploads(req.file);
      }
    }

    const cat = await Cat.create({
      shelterId: normalizedShelterId,
      userId: normalizedUserId,
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

    return res.status(201).json(serializeCat(cat, req));
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
  previousListingType,
  previousListingStatus,
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

    const normalizedUserId = toOptionalPositiveInt(userId);
    const normalizedShelterId = toOptionalPositiveInt(shelterId);

    let imageUrl = cat.image_url;

    if (req.file) {
      if (hasCloudinaryConfig()) {
        try {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
          imageUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload failed, falling back to local uploads:', uploadError);
          imageUrl = await saveBufferToLocalUploads(req.file);
        }
      } else {
        imageUrl = await saveBufferToLocalUploads(req.file);
      }
    } else if (req.body.image_url || req.body.imageUrl) {
      imageUrl = req.body.image_url || req.body.imageUrl;
    }

    await cat.update({
      shelterId: shelterId !== undefined ? normalizedShelterId : cat.shelterId,
      userId: userId !== undefined ? normalizedUserId : cat.userId,
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
      source:
        source !== undefined
          ? (source?.trim()?.toLowerCase() || 'shelter')
          : cat.source,
      urgency:
        urgency !== undefined
          ? (urgency?.trim()?.toLowerCase() || null)
          : cat.urgency,
      personality:
        personality !== undefined
          ? (personality?.trim() || null)
          : cat.personality,
      sex:
        sex !== undefined
          ? (sex?.trim()?.toLowerCase() || null)
          : cat.sex,
      sourceType: sourceType || cat.sourceType,
      listingType: listingType || cat.listingType,
      listingStatus: listingStatus || cat.listingStatus,
      previousListingType:
  previousListingType !== undefined ? previousListingType : cat.previousListingType,
previousListingStatus:
  previousListingStatus !== undefined ? previousListingStatus : cat.previousListingStatus,
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

    return res.json(serializeCat(cat, req));
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

    const applicantUserId = toOptionalPositiveInt(req.body?.userId ?? req.body?.user_id);
    if (!applicantUserId) {
      return res.status(400).json({ message: 'Applicant userId is required' });
    }

    const requestedTypeRaw = String(req.body?.type || '').trim().toLowerCase();
    const inferredType =
      cat.listingType === 'foster' || cat.listingStatus === 'pending' ? 'foster' : 'adoption';
    const requestType =
      requestedTypeRaw === 'foster' || requestedTypeRaw === 'adoption'
        ? requestedTypeRaw
        : inferredType;

    const existingPending = await AdoptionRequest.findOne({
      where: {
        userId: applicantUserId,
        catId: cat.id,
        type: requestType,
        status: 'pending',
      },
    });

    if (existingPending) {
      return res.status(409).json({
        message: 'You already have a pending request for this cat.',
        requestId: existingPending.id,
      });
    }

    const requestComment = req.body?.comment?.trim() || req.body?.message?.trim() || null;

    const request = await AdoptionRequest.create({
      userId: applicantUserId,
      catId: cat.id,
      type: requestType,
      status: 'pending',
      comment: requestComment,
    });

    return res.status(202).json({
      message: 'Your request has been sent successfully.',
      catId: cat.id,
      requestId: request.id,
      type: request.type,
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
