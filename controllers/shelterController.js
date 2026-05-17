import { BasicUser } from '../models/BasicUser.js';
import { Shelter } from '../models/Shelter.js';
import { Cat } from '../models/Cat.js';
import { AdoptionRequest } from '../models/AdoptionRequest.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

const buildProfileResponse = (user, shelter) => ({
  userId: user.id,
  email: user.email || '',
  shelterId: shelter?.id || null,
  name: shelter?.name || '',
  phone: shelter?.phone || '',
  logo: shelter?.logo || '',
  address: shelter?.address || '',
  description: shelter?.description || '',
  adoptionConditions: shelter?.adoptionConditions || '',
  instagram: shelter?.instagram || '',
  facebook: shelter?.facebook || '',
  telegram: shelter?.telegram || '',
});

export async function getShelterProfile(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await BasicUser.findByPk(userId, {
      attributes: ['id', 'email', 'role'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const shelter = await Shelter.findOne({
      where: { userId: user.id },
    });

    res.json(buildProfileResponse(user, shelter));
  } catch (err) {
    next(err);
  }
}

export async function updateShelterProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const {
      email,
      password,
      name,
      phone,
      logo,
      address,
      description,
      adoptionConditions,
      instagram,
      facebook,
      telegram,
    } = req.body;

    const user = await BasicUser.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email !== undefined) {
      user.email = email?.trim().toLowerCase() || user.email;
    }

    if (password !== undefined && password.trim() !== '') {
      // If you add bcrypt later, hash the password here
      user.password = password.trim();
    }

    await user.save();

    const [shelter] = await Shelter.findOrCreate({
      where: { userId: user.id },
      defaults: {
        userId: user.id,
      },
    });

    shelter.name = name?.trim() || '';
    shelter.phone = phone?.trim() || '';
    shelter.logo = logo || '';
    shelter.address = address?.trim() || '';
    shelter.description = description?.trim() || '';
    shelter.adoptionConditions = adoptionConditions?.trim() || '';
    shelter.instagram = instagram?.trim() || '';
    shelter.facebook = facebook?.trim() || '';
    shelter.telegram = telegram?.trim() || '';

    await shelter.save();

    res.json(buildProfileResponse(user, shelter));
  } catch (err) {
    next(err);
  }
}

const toRelativeTime = (dateLike) => {
  if (!dateLike) return '';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const toPublicImageUrl = (imageUrl, req) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith('/')) {
    return `${req.protocol}://${req.get('host')}${imageUrl}`;
  }
  return imageUrl;
};

export async function listShelterRequests(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const shelter = await Shelter.findOne({
      where: { userId },
      attributes: ['id'],
    });

    if (!shelter?.id) {
      return res.json([]);
    }

    const shelterCats = await Cat.findAll({
      where: { shelterId: shelter.id },
      attributes: ['id', 'name', 'image_url', 'breed', 'age', 'description', 'sex', 'personality'],
    });

    const catIds = shelterCats.map((cat) => Number(cat.id)).filter((id) => id > 0);

    if (catIds.length === 0) {
      return res.json([]);
    }

    const statusFilter = String(req.query?.status || '').trim().toLowerCase();
    const typeFilter = String(req.query?.type || '').trim().toLowerCase();
    const where = { catId: catIds };
    if (['pending', 'approved', 'rejected'].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (['adoption', 'foster'].includes(typeFilter)) {
      where.type = typeFilter;
    }

    const requests = await AdoptionRequest.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    const applicantIds = [...new Set(requests.map((item) => Number(item.userId)).filter((id) => id > 0))];
    const applicants = applicantIds.length
      ? await BasicUser.findAll({
          where: { id: applicantIds },
          attributes: ['id', 'firstName', 'email', 'phone'],
        })
      : [];
    const applicantById = new Map(
      applicants.map((user) => [
        Number(user.id),
        { firstName: user.firstName, email: user.email, phone: user.phone || '' },
      ])
    );

    const catById = new Map(
      shelterCats.map((cat) => [
        Number(cat.id),
        {
          name: cat.name || 'Unnamed cat',
          photo: toPublicImageUrl(cat.image_url || null, req),
          breed: cat.breed || '',
          age: cat.age ?? null,
          description: cat.description || '',
          sex: cat.sex || '',
          personality: cat.personality || '',
        },
      ])
    );

    const payload = requests
      .map((item) => {
      const applicant = applicantById.get(Number(item.userId));
      const catInfo = catById.get(Number(item.catId)) || {};
      if (!catInfo?.name) {
        return null;
      }

      return {
        id: item.id,
        type: item.type,
        typeLabel: item.type === 'foster' ? 'Foster Care' : 'Adoption',
        catId: item.catId,
        catName: catInfo.name,
        catPhoto: catInfo.photo,
        catBreed: catInfo.breed,
        catAge: catInfo.age,
        catDescription: catInfo.description,
        catSex: catInfo.sex,
        catPersonality: catInfo.personality,
        applicantId: item.userId,
        applicant: applicant?.firstName || applicant?.email || `User #${item.userId}`,
        applicantName: applicant?.firstName || applicant?.email || `User #${item.userId}`,
        applicantEmail: applicant?.email || '',
        applicantPhone: applicant?.phone || '',
        comment: item.comment || '',
        status: item.status,
        statusLabel:
          item.status === 'approved'
            ? 'Approved'
            : item.status === 'rejected'
              ? 'Rejected'
              : 'Pending',
        createdAt: item.createdAt || item.created_at,
        updatedAt: null,
        time: toRelativeTime(item.createdAt || item.created_at),
      };
    })
      .filter(Boolean);

    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function updateShelterRequestStatus(req, res, next) {
  try {
    const requestId = Number(req.params.requestId);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const managerUserId = Number(req.body?.userId || req.query?.userId);
    if (!Number.isInteger(managerUserId) || managerUserId <= 0) {
      return res.status(400).json({ message: 'Manager userId is required' });
    }

    const shelter = await Shelter.findOne({
      where: { userId: managerUserId },
      attributes: ['id'],
    });
    if (!shelter?.id) {
      return res.status(403).json({ message: 'Only shelter managers can update request status' });
    }

    const request = await AdoptionRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const requestedCat = await Cat.findByPk(request.catId, {
      attributes: ['id', 'shelterId'],
    });
    if (!requestedCat || Number(requestedCat.shelterId) !== Number(shelter.id)) {
      return res.status(403).json({ message: 'You can update only your shelter requests' });
    }

    if (status === 'approved') {
      await sequelize.transaction(async (transaction) => {
        await request.update({ status }, { transaction });

        await requestedCat.update(
          {
            userId: request.userId,
            shelterId: null,
            source: 'shelter',
            sourceType: 'shelter',
            listingType: request.type === 'foster' ? 'foster' : 'adoption',
            listingStatus: 'adopted',
            previousListingType: null,
            previousListingStatus: null,
          },
          { transaction }
        );

        await AdoptionRequest.update(
          { status: 'rejected' },
          {
            where: {
              catId: request.catId,
              status: 'pending',
              id: { [Op.ne]: request.id },
            },
            transaction,
          }
        );
      });
    } else {
      await request.update({ status });
    }

    return res.json({
      message: 'Request updated successfully',
      id: request.id,
      status,
      updatedAt: request.updatedAt || request.updated_at || null,
    });
  } catch (err) {
    next(err);
  }
}