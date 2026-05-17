import { Cat } from '../models/Cat.js';
import { cloudinary } from '../config/cloudinary.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';
import { AchievementEvent } from '../models/AchievementEvent.js';
import { Shelter } from '../models/Shelter.js';
import { AdoptionRequest } from '../models/AdoptionRequest.js';
import { BasicUser } from '../models/BasicUser.js';
import { Op } from 'sequelize';
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
  const imageUrl = raw?.image_url ?? raw?.imageUrl ?? null;
  return {
    ...raw,
    image_url: toPublicImageUrl(imageUrl, req),
    imageUrl: toPublicImageUrl(imageUrl, req),
    fosterStartDate: raw?.fosterStartDate ?? raw?.foster_start_date ?? null,
    fosterEndDate: raw?.fosterEndDate ?? raw?.foster_end_date ?? null,
    fosterCity: raw?.fosterCity ?? raw?.foster_city ?? null,
    fosterComment: raw?.fosterComment ?? raw?.foster_comment ?? null,
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


const toDateOnlyString = (value) => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const iso = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const isFosterSubPeriodWithinOwner = (requestStart, requestEnd, ownerStart, ownerEnd) => {
  const reqStart = toDateOnlyString(requestStart);
  const reqEnd = toDateOnlyString(requestEnd);
  const availStart = toDateOnlyString(ownerStart);
  const availEnd = toDateOnlyString(ownerEnd);
  if (!reqStart || !reqEnd || !availStart || !availEnd) return true;
  if (reqEnd < reqStart) return false;
  return reqStart >= availStart && reqEnd <= availEnd;
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
  const hasPhoto = Boolean(cat.imageUrl ?? cat.image_url);
  const hasBreed = Boolean(cat.breed);
  const hasAge = cat.age !== null && cat.age !== undefined && cat.age !== '';
  const hasPersonality = Boolean(cat.personality);
  return hasPhoto && hasBreed && hasAge && hasPersonality;
}
const getRequestCreatedAt = (row) => {
  if (!row) return null;
  if (row.createdAt) return row.createdAt;
  if (row.created_at) return row.created_at;
  if (typeof row.getDataValue === 'function') {
    return row.getDataValue('created_at') ?? row.getDataValue('createdAt') ?? null;
  }
  return null;
};

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
    if (imageUrl && String(imageUrl).startsWith('blob:')) {
      imageUrl = null;
    }
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
      imageUrl,
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
  fosterStartDate,
  fosterEndDate,
  fosterCity,
  fosterComment,
} = req.body;

    const cat = await Cat.findByPk(id);

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    const normalizedUserId = toOptionalPositiveInt(userId);
    const normalizedShelterId = toOptionalPositiveInt(shelterId);

    let imageUrl = cat.imageUrl ?? cat.image_url;

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
    } else {
      const bodyImage = req.body.image_url || req.body.imageUrl;
      if (bodyImage && !String(bodyImage).startsWith('blob:')) {
        imageUrl = bodyImage;
      }
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
      imageUrl,
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
      fosterStartDate:
        fosterStartDate !== undefined ? fosterStartDate || null : cat.fosterStartDate,
      fosterEndDate:
        fosterEndDate !== undefined ? fosterEndDate || null : cat.fosterEndDate,
      fosterCity: fosterCity !== undefined ? fosterCity?.trim() || null : cat.fosterCity,
      fosterComment:
        fosterComment !== undefined ? fosterComment?.trim() || null : cat.fosterComment,
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
    const isLegacyFosterEndpoint = String(req.originalUrl || '')
      .toLowerCase()
      .includes('/foster-request');
    const inferredType =
      isLegacyFosterEndpoint || cat.listingType === 'foster' || cat.listingStatus === 'pending'
        ? 'foster'
        : 'adoption';
    const requestType =
      requestedTypeRaw === 'foster' || requestedTypeRaw === 'adoption'
        ? requestedTypeRaw
        : inferredType;

    const isOwnCat = Number(cat.userId) === Number(applicantUserId);
    const isPrivateCat =
      String(cat.sourceType || '').toLowerCase() === 'private' ||
      String(cat.source || '').toLowerCase() === 'private';
    if (isOwnCat && !(isPrivateCat && requestType === 'foster')) {
      return res
        .status(400)
        .json({ message: 'You cannot submit an adoption request for your own cat profile.' });
    }

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
    const experienceLevel =
      req.body?.experienceLevel?.trim() ||
      req.body?.experience_level?.trim() ||
      null;
    const bodyStart = req.body?.startDate || req.body?.start_date || null;
    const bodyEnd = req.body?.endDate || req.body?.end_date || null;
    const ownerStart = cat.fosterStartDate || null;
    const ownerEnd = cat.fosterEndDate || null;
    const startDate = toDateOnlyString(bodyStart) || toDateOnlyString(ownerStart) || null;
    const endDate = toDateOnlyString(bodyEnd) || toDateOnlyString(ownerEnd) || null;

    if (requestType === 'foster' && !isOwnCat && (!startDate || !endDate)) {
      return res.status(400).json({
        message: 'Foster start and end dates are required.',
      });
    }

    if (requestType === 'foster' && !isOwnCat && startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        message: 'End date cannot be earlier than start date.',
      });
    }

    if (
      requestType === 'foster' &&
      ownerStart &&
      ownerEnd &&
      !isOwnCat &&
      !isFosterSubPeriodWithinOwner(startDate, endDate, ownerStart, ownerEnd)
    ) {
      return res.status(400).json({
        message: 'Your requested foster period must fall within the dates set by the cat owner.',
      });
    }
    const contactPhoneRaw = (req.body?.phone ?? req.body?.contactPhone ?? '').toString().trim();
    const contactPhone = contactPhoneRaw || null;

    if (!isOwnCat) {
      if (!contactPhone || contactPhone.length < 5 || contactPhone.length > 50) {
        return res.status(400).json({
          message: 'Contact phone is required (5–50 characters).',
        });
      }
    }

    const request = await AdoptionRequest.create({
      userId: applicantUserId,
      catId: cat.id,
      type: requestType,
      status: 'pending',
      comment: requestComment,
      experienceLevel,
      startDate,
      endDate,
    });

    if (!isOwnCat && contactPhone) {
      await BasicUser.update({ phone: contactPhone }, { where: { id: applicantUserId } });
    }

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

export async function getReceivedFosterRequests(req, res, next) {
  try {
    const ownerUserId = toOptionalPositiveInt(req.params.userId);

    if (!ownerUserId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const ownedShelters = await Shelter.findAll({
      where: { userId: ownerUserId },
      attributes: ['id'],
    });
    const shelterIds = ownedShelters.map((s) => s.id).filter(Boolean);

    const ownerCatWhere = shelterIds.length
      ? {
          [Op.or]: [{ userId: ownerUserId }, { shelterId: { [Op.in]: shelterIds } }],
        }
      : { userId: ownerUserId };

    const ownerCats = await Cat.findAll({
      where: ownerCatWhere,
      attributes: [
        'id',
        'name',
        'breed',
        'imageUrl',
        'fosterStartDate',
        'fosterEndDate',
        'fosterCity',
      ],
      order: [['id', 'DESC']],
    });

    if (!ownerCats.length) {
      return res.json([]);
    }

    const catIds = ownerCats.map((c) => c.id);

    const requests = await AdoptionRequest.findAll({
      where: {
        catId: { [Op.in]: catIds },
      },
      order: [['created_at', 'DESC']],
    });

    if (!requests.length) {
      return res.json([]);
    }

    const requesterIds = [...new Set(requests.map((item) => item.userId).filter(Boolean))];

    const requestUsers = requesterIds.length
      ? await BasicUser.findAll({
          where: { id: { [Op.in]: requesterIds } },
          attributes: ['id', 'firstName', 'email', 'phone'],
        })
      : [];

    const catsMap = new Map(ownerCats.map((c) => [c.id, c]));
    const usersMap = new Map(requestUsers.map((u) => [u.id, u]));

    const result = requests.map((reqRow) => {
      const rowCat = catsMap.get(reqRow.catId);
      const user = usersMap.get(reqRow.userId);
      const catJson = rowCat ? rowCat.toJSON() : null;

      return {
        id: reqRow.id,
        type: reqRow.type,
        status: reqRow.status,
        experienceLevel: reqRow.experienceLevel,
        startDate: reqRow.startDate,
        endDate: reqRow.endDate,
        comment: reqRow.comment,
        createdAt: getRequestCreatedAt(reqRow),
        cat: catJson
          ? {
              id: catJson.id,
              name: catJson.name,
              breed: catJson.breed,
              image_url: toPublicImageUrl(catJson.imageUrl || catJson.image_url, req),
              fosterStartDate: catJson.fosterStartDate,
              fosterEndDate: catJson.fosterEndDate,
              fosterCity: catJson.fosterCity,
            }
          : null,
        requester: user
          ? {
              id: user.id,
              firstName: user.firstName,
              email: user.email,
              phone: user.phone,
            }
          : null,
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSentFosterRequests(req, res, next) {
  try {
    const applicantUserId = toOptionalPositiveInt(req.params.userId);

    if (!applicantUserId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const requests = await AdoptionRequest.findAll({
      where: { userId: applicantUserId },
      order: [['created_at', 'DESC']],
    });

    if (!requests.length) {
      return res.json([]);
    }

    const catIds = [...new Set(requests.map((item) => item.catId).filter(Boolean))];
    const cats = await Cat.findAll({
      where: { id: { [Op.in]: catIds } },
      attributes: ['id', 'name', 'breed', 'imageUrl', 'userId', 'fosterCity'],
    });

    const ownerIds = [...new Set(cats.map((c) => c.userId).filter(Boolean))];
    const owners = ownerIds.length
      ? await BasicUser.findAll({
          where: { id: { [Op.in]: ownerIds } },
          attributes: ['id', 'firstName', 'email', 'phone'],
        })
      : [];

    const catsMap = new Map(cats.map((c) => [c.id, c]));
    const ownersMap = new Map(owners.map((u) => [u.id, u]));

    const result = requests.map((reqRow) => {
      const rowCat = catsMap.get(reqRow.catId);
      const catJson = rowCat ? rowCat.toJSON() : null;
      const owner = catJson?.userId ? ownersMap.get(catJson.userId) : null;

      return {
        id: reqRow.id,
        type: reqRow.type,
        status: reqRow.status,
        experienceLevel: reqRow.experienceLevel,
        startDate: reqRow.startDate,
        endDate: reqRow.endDate,
        comment: reqRow.comment,
        createdAt: getRequestCreatedAt(reqRow),
        cat: catJson
          ? {
              id: catJson.id,
              name: catJson.name,
              breed: catJson.breed,
              image_url: toPublicImageUrl(catJson.imageUrl || catJson.image_url, req),
              fosterCity: catJson.fosterCity,
            }
          : null,
        owner: owner
          ? {
              id: owner.id,
              firstName: owner.firstName,
              email: owner.email,
              phone: owner.phone,
            }
          : null,
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateFosterRequestStatus(req, res, next) {
  try {
    const requestId = Number(req.params.requestId);
    const { status } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await AdoptionRequest.findByPk(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    await request.update({ status });

    if (status === 'approved') {
      await AdoptionRequest.update(
        { status: 'rejected' },
        {
          where: {
            catId: request.catId,
            type: request.type,
            status: 'pending',
            id: { [Op.ne]: request.id },
          },
        }
      );

      const cat = await Cat.findByPk(request.catId);

      if (cat) {
        await cat.update({
          listingType: 'none',
          listingStatus: request.type === 'adoption' ? 'adopted' : 'placed',
        });
      }
    }

    return res.json({
      message: `Request ${status} successfully`,
      request,
    });
  } catch (err) {
    next(err);
  }
}

const userOwnsCat = async (cat, ownerUserId) => {
  if (!cat || !ownerUserId) return false;
  if (Number(cat.userId) === Number(ownerUserId)) return true;
  if (!cat.shelterId) return false;
  const shelter = await Shelter.findByPk(cat.shelterId, { attributes: ['userId'] });
  return Number(shelter?.userId) === Number(ownerUserId);
};

export async function deleteSentFosterRequest(req, res, next) {
  try {
    const requestId = Number(req.params.requestId);
    const actingUserId = toOptionalPositiveInt(
      req.body?.userId ?? req.body?.user_id ?? req.query?.userId ?? req.query?.user_id
    );

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Invalid request id' });
    }
    if (!actingUserId) {
      return res.status(400).json({ message: 'User id is required' });
    }

    const request = await AdoptionRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const isApplicant = Number(request.userId) === Number(actingUserId);
    let isCatOwner = false;
    if (!isApplicant) {
      const cat = await Cat.findByPk(request.catId, {
        attributes: ['id', 'userId', 'shelterId'],
      });
      isCatOwner = await userOwnsCat(cat, actingUserId);
    }

    if (!isApplicant && !isCatOwner) {
      return res.status(403).json({ message: 'You cannot remove this request' });
    }

    await request.destroy();

    return res.json({
      message: 'Request removed',
      requestId,
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
