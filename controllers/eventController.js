import { Event } from '../models/Event.js';
import { cloudinary } from '../config/cloudinary.js';
import fs from 'fs/promises';
import path from 'path';

function uploadBufferToCloudinary(fileBuffer, folder = 'musyamatch/events') {
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

const serializeEvent = (event, req) => {
  const raw = typeof event?.toJSON === 'function' ? event.toJSON() : event;
  return {
    ...raw,
    image_url: toPublicImageUrl(raw?.imageUrl || raw?.image_url, req),
  };
};

// GET /api/events - Get all events
export const getEvents = async (req, res) => {
  try {
    const { shelterId, userId } = req.query;
    
    let whereClause = {};
    
    if (shelterId) {
      whereClause.shelterId = shelterId;
    } else if (userId) {
      whereClause.userId = userId;
    }

    const events = await Event.findAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      order: [['created_at', 'DESC']],
    });

    const serializedEvents = events.map(event => serializeEvent(event, req));
    res.json(serializedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// GET /api/events/:id - Get single event
export const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(serializeEvent(event, req));
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// POST /api/events - Create new event
export const createEvent = async (req, res) => {
  try {
    console.log('📸 Create event - Request body:', req.body);
    console.log('📸 Create event - File:', req.file);
    
    const { title, description, date, location, cost, status, shelterId, userId } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Event title is required' });
    }

    let imageUrl = null;

    // Handle image upload
    if (req.file) {
      console.log('📸 Processing image upload:', req.file.originalname);
      try {
        if (hasCloudinaryConfig()) {
          const result = await uploadBufferToCloudinary(req.file.buffer);
          imageUrl = result.secure_url;
        } else {
          // Fallback to local storage if no Cloudinary config
          const filename = `event-${Date.now()}${path.extname(req.file.originalname)}`;
          const uploadPath = path.join(process.cwd(), 'uploads', 'events', filename);
          await fs.mkdir(path.dirname(uploadPath), { recursive: true });
          await fs.writeFile(uploadPath, req.file.buffer);
          imageUrl = `/uploads/events/${filename}`;
        }
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue without image if upload fails
      }
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim() || null,
      date: date || null,
      location: location?.trim() || null,
      cost: cost?.trim() || null,
      status: status || 'active',
      imageUrl,
      shelterId: shelterId ? parseInt(shelterId) : null,
      userId: userId ? parseInt(userId) : null,
    });

    res.status(201).json(serializeEvent(event, req));
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// PUT /api/events/:id - Update event
export const updateEvent = async (req, res) => {
  try {
    console.log('📸 Update event - Request body:', req.body);
    console.log('📸 Update event - File:', req.file);
    
    const { id } = req.params;
    const { title, description, date, location, cost, status, shelterId, userId } = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let imageUrl = event.image_url;

    // Handle image upload
    if (req.file) {
      console.log('📸 Processing image upload for update:', req.file.originalname);
      try {
        console.log('📸 Has Cloudinary config:', hasCloudinaryConfig());
        if (hasCloudinaryConfig()) {
          console.log('📸 Uploading to Cloudinary...');
          const result = await uploadBufferToCloudinary(req.file.buffer);
          imageUrl = result.secure_url;
          console.log('📸 Cloudinary upload success:', imageUrl);
        } else {
          console.log('📸 Using local storage...');
          const filename = `event-${Date.now()}${path.extname(req.file.originalname)}`;
          const uploadPath = path.join(process.cwd(), 'uploads', 'events', filename);
          console.log('📸 Saving to:', uploadPath);
          await fs.mkdir(path.dirname(uploadPath), { recursive: true });
          await fs.writeFile(uploadPath, req.file.buffer);
          imageUrl = `/uploads/events/${filename}`;
          console.log('📸 Local storage success:', imageUrl);
        }
      } catch (uploadError) {
        console.error('📸 Error uploading image:', uploadError);
      }
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    console.log('📸 Final imageUrl:', imageUrl);
    await event.update({
      title: title?.trim() || event.title,
      description: description?.trim() || event.description,
      date: date !== undefined ? date : event.date,
      location: location?.trim() || event.location,
      cost: cost?.trim() || event.cost,
      status: status || event.status,
      imageUrl,
      shelterId: shelterId !== undefined ? parseInt(shelterId) : event.shelterId,
      userId: userId !== undefined ? parseInt(userId) : event.userId,
    });

    console.log('📸 Event updated successfully');
    const serializedEvent = serializeEvent(event, req);
    console.log('📸 Serialized event:', serializedEvent);
    res.json(serializedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// PUT /api/events/:id/status - Update event status
export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.update({ status });

    res.json(serializeEvent(event, req));
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
};

// DELETE /api/events/:id - Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
