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

/**
 * GET /api/cats — returns all cats ordered by id.
 */
export async function getCats(req, res, next) {
  try {
    const cats = await Cat.findAll({
      order: [['id', 'ASC']],
    });
    res.json(cats);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cats — creates a cat listing and uploads image to Cloudinary.
 * Requires multipart/form-data with "image" file.
 */
export async function createCat(req, res, next) {
  try {
    const { name, breed, age, description, source, urgency, personality, sex } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

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

    return res.status(202).json({
      message: 'Foster request accepted (stub). We will contact you soon.',
      catId: cat.id,
    });
  } catch (err) {
    next(err);
  }
}
