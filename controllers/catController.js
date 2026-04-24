import { Cat } from '../models/Cat.js';
import { cloudinary } from '../config/cloudinary.js';

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
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer);

    const created = await Cat.create({
      name: name.trim(),
      breed: breed?.trim() || null,
      age: age ? Number(age) : null,
      description: description?.trim() || null,
      image_url: uploadResult.secure_url,
      source: source?.trim()?.toLowerCase() || 'shelter',
      urgency: urgency?.trim()?.toLowerCase() || null,
      personality: personality?.trim() || null,
      sex: sex?.trim()?.toLowerCase() || null,
    });

    return res.status(201).json(created);
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

/**
 * POST /api/cats/:id/foster-request — placeholder foster request endpoint.
 * For now it only validates cat existence and returns accepted response.
 */
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
