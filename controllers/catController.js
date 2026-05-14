import { Cat } from '../models/Cat.js';
import { cloudinary } from '../config/cloudinary.js';
import { ACHIEVEMENT_TYPES, awardPoints } from '../services/achievements.js';
import { AchievementEvent } from '../models/AchievementEvent.js';
import { Shelter } from '../models/Shelter.js';
import { AdoptionRequest } from '../models/AdoptionRequest.js';
import { BasicUser } from '../models/BasicUser.js';
import { Op } from 'sequelize';


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
      try {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed, creating cat without image:', uploadError);
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



    let imageUrl = cat.image_url;

    if (req.file) {
      try {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
        imageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload failed, keeping previous image:', uploadError);
      }
    } else if (req.body.image_url || req.body.imageUrl) {
      imageUrl = req.body.image_url || req.body.imageUrl;
    }

    const normalizedShelterId =
      shelterId !== undefined ? normalizeNullableInt(shelterId) : cat.shelterId;

    const normalizedUserId =
      userId !== undefined ? normalizeNullableInt(userId) : cat.userId;

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

  fosterStartDate:
  fosterStartDate !== undefined ? (fosterStartDate || null) : cat.fosterStartDate,
fosterEndDate:
  fosterEndDate !== undefined ? (fosterEndDate || null) : cat.fosterEndDate,
fosterCity:
  fosterCity !== undefined ? (fosterCity?.trim() || null) : cat.fosterCity,
fosterComment:
  fosterComment !== undefined ? (fosterComment?.trim() || null) : cat.fosterComment,

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
    const { userId, experienceLevel, startDate, endDate, comment } = req.body;

    if (!Number.isInteger(catId) || catId <= 0) {
      return res.status(400).json({ message: 'Invalid cat id' });
    }

    const normalizedUserId = toOptionalPositiveInt(userId);

    if (!normalizedUserId) {
      return res.status(400).json({ message: 'User is required' });
    }

    if (!experienceLevel) {
      return res.status(400).json({ message: 'Experience level is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Foster period is required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be earlier than start date' });
    }

    const cat = await Cat.findByPk(catId);
    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    const user = await BasicUser.findByPk(normalizedUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (cat.userId && Number(cat.userId) === normalizedUserId) {
      return res.status(400).json({ message: 'You cannot submit a foster request for your own cat' });
    }

    const existingPendingRequest = await AdoptionRequest.findOne({
      where: {
        userId: normalizedUserId,
        catId,
        type: 'foster',
        status: 'pending',
      },
    });

    if (existingPendingRequest) {
      return res.status(409).json({ message: 'You already have a pending foster request for this cat' });
    }

    const fosterRequest = await AdoptionRequest.create({
      userId: normalizedUserId,
      catId,
      type: 'foster',
      experienceLevel,
      startDate,
      endDate,
      comment: comment?.trim() || null,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Foster request sent successfully',
      request: fosterRequest,
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

export async function getReceivedFosterRequests(req, res, next) {
  try {
    const ownerUserId = toOptionalPositiveInt(req.params.userId);

    if (!ownerUserId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const ownerCats = await Cat.findAll({
      where: { userId: ownerUserId },
      attributes: [
        'id',
        'name',
        'breed',
        'image_url',
        'fosterStartDate',
        'fosterEndDate',
        'fosterCity',
      ],
      order: [['id', 'DESC']],
    });

    if (!ownerCats.length) {
      return res.json([]);
    }

    const catIds = ownerCats.map((cat) => cat.id);

    const requests = await AdoptionRequest.findAll({
      where: {
        catId: { [Op.in]: catIds },
        type: 'foster',
      },
      order: [['createdAt', 'DESC']],
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

    const catsMap = new Map(ownerCats.map((cat) => [cat.id, cat]));
    const usersMap = new Map(requestUsers.map((user) => [user.id, user]));

    const result = requests.map((request) => {
      const cat = catsMap.get(request.catId);
      const user = usersMap.get(request.userId);

      return {
        id: request.id,
        type: request.type,
        status: request.status,
        experienceLevel: request.experienceLevel,
        startDate: request.startDate,
        endDate: request.endDate,
        comment: request.comment,
        createdAt: request.createdAt,
        cat: cat
          ? {
              id: cat.id,
              name: cat.name,
              breed: cat.breed,
              image_url: cat.image_url,
              fosterStartDate: cat.fosterStartDate,
              fosterEndDate: cat.fosterEndDate,
              fosterCity: cat.fosterCity,
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

    if (!request || request.type !== 'foster') {
      return res.status(404).json({ message: 'Foster request not found' });
    }

    await request.update({ status });

    if (status === 'approved') {
      await AdoptionRequest.update(
        { status: 'rejected' },
        {
          where: {
            catId: request.catId,
            type: 'foster',
            status: 'pending',
            id: { [Op.ne]: request.id },
          },
        }
      );

      const cat = await Cat.findByPk(request.catId);

      if (cat) {
        await cat.update({
          listingType: 'none',
          listingStatus: 'placed',
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