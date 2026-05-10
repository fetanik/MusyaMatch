import { Event } from '../models/Event.js';
import { Shelter } from '../models/Shelter.js';

const TYPES = new Set(['private', 'opened']);
const STATUSES = new Set(['upcoming', 'completed', 'cancelled']);

// Допоміжні функції (такі ж, як у needController)
const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const resolveShelterId = async (rawShelterId, rawUserId) => {
  const shelterId = toOptionalPositiveInt(rawShelterId);
  const userId = toOptionalPositiveInt(rawUserId);

  if (shelterId) return { shelterId, userId };

  if (userId) {
    const shelter = await Shelter.findOne({
      where: { userId }, // Зверніть увагу: переконайтеся, що у моделі Shelter є зв'язок з userId
      attributes: ['id'],
    });
    if (shelter?.id) return { shelterId: shelter.id, userId };
  }

  return { shelterId: null, userId };
};

// GET /api/events
export async function getEvents(req, res, next) {
  try {
    const { shelterId } = await resolveShelterId(req.query.shelterId, req.query.userId);
    const where = {};

    if (shelterId) {
      where.shelterId = shelterId;
    }

    const events = await Event.findAll({
      where,
      order: [['eventDate', 'ASC']], // Сортуємо від найближчих подій
    });

    // Мапимо дані для фронтенду
    const formattedEvents = events.map((e) => {
      const d = new Date(e.eventDate);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = d.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      return {
        id: e.id,
        title: e.name,              // БД: name -> Фронт: title
        location: e.address,        // БД: address -> Фронт: location
        eventDate: dateStr,
        eventTime: timeStr,
        description: e.description || '',
        status: e.status || 'upcoming',
        type: e.type,
      };
    });

    return res.json(formattedEvents);
  } catch (err) {
    return next(err);
  }
}

// POST /api/events
export async function createEvent(req, res, next) {
  try {
    const { shelterId } = await resolveShelterId(req.body.shelterId, req.body.userId);
    
    if (!shelterId) {
      return res.status(400).json({ message: 'Shelter ID is required to create an event' });
    }

    const title = req.body.title?.trim();
    const location = req.body.location?.trim() || null;
    const description = req.body.description?.trim() || null;
    const eventDateStr = req.body.eventDate?.trim();
    const eventTimeStr = req.body.eventTime?.trim() || '00:00';
    const status = req.body.status?.trim()?.toLowerCase() || 'upcoming';
    const type = req.body.type?.trim()?.toLowerCase() || 'opened';

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!eventDateStr) return res.status(400).json({ message: 'Event date is required' });
    if (!STATUSES.has(status)) return res.status(400).json({ message: 'Invalid status' });
    if (!TYPES.has(type)) return res.status(400).json({ message: 'Invalid type' });

    // Об'єднуємо дату і час у формат DATETIME
    const combinedDate = new Date(`${eventDateStr}T${eventTimeStr}:00`);

    const event = await Event.create({
      shelterId,
      name: title,
      address: location,
      eventDate: combinedDate,
      type,
      description,
      status,
    });

    return res.status(201).json(event);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/events/:id
export async function updateEvent(req, res, next) {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const title = req.body.title?.trim() || event.name;
    const location = req.body.location !== undefined ? req.body.location?.trim() || null : event.address;
    const description = req.body.description !== undefined ? req.body.description?.trim() || null : event.description;
    const status = req.body.status?.trim()?.toLowerCase() || event.status;
    const type = req.body.type?.trim()?.toLowerCase() || event.type;

    const eventDateStr = req.body.eventDate?.trim();
    const eventTimeStr = req.body.eventTime?.trim() || '00:00';
    
    let combinedDate = event.eventDate;
    if (eventDateStr) {
       combinedDate = new Date(`${eventDateStr}T${eventTimeStr}:00`);
    }

    if (!STATUSES.has(status)) return res.status(400).json({ message: 'Invalid status' });
    if (!TYPES.has(type)) return res.status(400).json({ message: 'Invalid type' });

    await event.update({
      name: title,
      address: location,
      eventDate: combinedDate,
      type,
      description,
      status,
    });

    return res.json(event);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/events/:id
export async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.destroy();

    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    return next(err);
  }
}