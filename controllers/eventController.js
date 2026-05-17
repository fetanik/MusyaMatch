import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { BasicUser } from '../models/BasicUser.js';
import { Shelter } from '../models/Shelter.js';
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

const formatTimeForApi = (value) => {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return s;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const serializeEvent = (event, req) => {
  const raw = typeof event?.toJSON === 'function' ? event.toJSON() : event;
  return {
    ...raw,
    image_url: toPublicImageUrl(raw?.imageUrl || raw?.image_url, req),
    event_time: formatTimeForApi(raw?.eventTime ?? raw?.event_time),
    max_participants: raw?.maxParticipants ?? raw?.max_participants ?? null,
  };
};

const ACTIVE_REGISTRATION_STATUSES = ['pending', 'approved'];

/** Count only end-user sign-ups — not managers/admins or the event organizer. */
const PARTICIPANT_COUNT_SQL = `
  FROM event_registration er
  INNER JOIN basic_user bu ON bu.id = er.user_id
  INNER JOIN events e ON e.id = er.event_id
  WHERE er.status IN ('pending', 'approved')
    AND bu.role = 'user'
    AND (e.user_id IS NULL OR er.user_id != e.user_id)
`;

async function countEligibleParticipants(eventId) {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count ${PARTICIPANT_COUNT_SQL} AND er.event_id = :eventId`,
    { replacements: { eventId }, type: QueryTypes.SELECT },
  );
  return Number(rows[0]?.count) || 0;
}

async function getRegistrationCountMap(eventIds) {
  if (!eventIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT er.event_id AS eventId, COUNT(*) AS count ${PARTICIPANT_COUNT_SQL} AND er.event_id IN (:eventIds) GROUP BY er.event_id`,
    { replacements: { eventIds }, type: QueryTypes.SELECT },
  );
  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.eventId), Number(row.count) || 0);
  }
  return map;
}

function enrichWithParticipantStats(serialized, participantsCount) {
  const maxRaw = serialized.maxParticipants ?? serialized.max_participants ?? null;
  const max =
    maxRaw != null && maxRaw !== '' ? Number(maxRaw) : null;
  const maxNum = Number.isInteger(max) && max > 0 ? max : null;
  const count = Number(participantsCount) || 0;
  const spotsLeft = maxNum != null ? Math.max(0, maxNum - count) : null;
  return {
    ...serialized,
    participants_count: count,
    spots_left: spotsLeft,
    is_full: maxNum != null && count >= maxNum,
  };
}

async function serializeEventsWithStats(events, req) {
  const ids = events.map((e) => e.id).filter(Boolean);
  const countMap = await getRegistrationCountMap(ids);
  return events.map((event) =>
    enrichWithParticipantStats(
      serializeEvent(event, req),
      countMap.get(event.id) || 0,
    ),
  );
}

/** Accepts multipart string fields; rejects NaN / invalid so MySQL never gets NaN */
const parsePositiveIntOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** DATEONLY column: YYYY-MM-DD or null */
const parseDateOnlyOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/** TIME column: HH:MM or HH:MM:SS */
const parseTimeOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  const sec = match[3] != null ? Number(match[3]) : 0;
  if (h > 23 || min > 59 || sec > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const parseMaxParticipantsOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function resolveShelterIdForManager(shelterIdRaw, userIdRaw) {
  const shelterId = parsePositiveIntOrNull(shelterIdRaw);
  if (shelterId) return shelterId;
  const userId = parsePositiveIntOrNull(userIdRaw);
  if (!userId) return null;
  const shelter = await Shelter.findOne({ where: { userId } });
  return shelter?.id ?? null;
}

function buildEventScopeWhere(shelterIdRaw, userIdRaw) {
  const shelterId = parsePositiveIntOrNull(shelterIdRaw);
  const userId = parsePositiveIntOrNull(userIdRaw);

  if (shelterId && userId) {
    return {
      [Op.or]: [{ shelterId }, { shelterId: null, userId }],
    };
  }
  if (shelterId) {
    return { shelterId };
  }
  if (userId) {
    return { userId };
  }
  return null;
}

async function assertManagerOwnsEvent(event, req) {
  const shelterId = await resolveShelterIdForManager(
    req.query?.shelterId ?? req.body?.shelterId,
    req.query?.userId ?? req.body?.userId,
  );
  const userId = parsePositiveIntOrNull(req.query?.userId ?? req.body?.userId);

  if (shelterId) {
    if (event.shelterId && event.shelterId !== shelterId) {
      const err = new Error('Not allowed to modify this event');
      err.statusCode = 403;
      throw err;
    }
    if (!event.shelterId && userId && event.userId !== userId) {
      const err = new Error('Not allowed to modify this event');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  if (userId && event.userId !== userId) {
    const err = new Error('Not allowed to modify this event');
    err.statusCode = 403;
    throw err;
  }
}

// GET /api/events - list (optional ?shelterId= & ?userId= for manager scope)
export const getEvents = async (req, res) => {
  try {
    const whereClause = buildEventScopeWhere(req.query.shelterId, req.query.userId);

    const events = await Event.findAll({
      where: whereClause || undefined,
      order: [['created_at', 'DESC']],
    });

    const serializedEvents = await serializeEventsWithStats(events, req);
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

    const [enriched] = await serializeEventsWithStats([event], req);
    res.json(enriched);
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
    
    const {
      title,
      description,
      date,
      eventTime,
      event_time,
      location,
      cost,
      status,
      shelterId,
      userId,
      maxParticipants,
      max_participants,
    } = req.body || {};
    
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
    } else if (req.body.image_url && !String(req.body.image_url).startsWith('blob:')) {
      imageUrl = req.body.image_url;
    }

    const allowedStatus = new Set(['active', 'inactive', 'cancelled', 'completed']);
    const nextStatus =
      status && allowedStatus.has(String(status).toLowerCase())
        ? String(status).toLowerCase()
        : 'active';

    const resolvedUserId = parsePositiveIntOrNull(userId);
    const resolvedShelterId = await resolveShelterIdForManager(shelterId, resolvedUserId);

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim() || null,
      date: parseDateOnlyOrNull(date),
      eventTime: parseTimeOrNull(eventTime ?? event_time),
      location: location?.trim() || null,
      cost: cost?.trim() || null,
      maxParticipants: parseMaxParticipantsOrNull(maxParticipants ?? max_participants),
      status: nextStatus,
      imageUrl,
      shelterId: resolvedShelterId,
      userId: resolvedUserId,
    });

    const [enriched] = await serializeEventsWithStats([event], req);
    res.status(201).json(enriched);
  } catch (error) {
    console.error('Error creating event:', error);
    const msg =
      error?.name === 'SequelizeDatabaseError'
        ? error?.parent?.sqlMessage || error?.message
        : error?.message;
    res.status(500).json({
      error: 'Failed to create event',
      message: msg || 'Unknown error',
    });
  }
};

// PUT /api/events/:id - Update event
export const updateEvent = async (req, res) => {
  try {
    console.log('📸 Update event - Request body:', req.body);
    console.log('📸 Update event - File:', req.file);
    
    const { id } = req.params;
    const {
      title,
      description,
      date,
      eventTime,
      event_time,
      location,
      cost,
      status,
      shelterId,
      userId,
      maxParticipants,
      max_participants,
    } = req.body || {};

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await assertManagerOwnsEvent(event, req);

    let imageUrl = event.imageUrl ?? null;

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
    } else if (req.body.image_url && !String(req.body.image_url).startsWith('blob:')) {
      imageUrl = req.body.image_url;
    }

    console.log('📸 Final imageUrl:', imageUrl);

    const allowedStatus = new Set(['active', 'inactive', 'cancelled', 'completed']);
    const nextStatus =
      status && allowedStatus.has(String(status).toLowerCase())
        ? String(status).toLowerCase()
        : event.status;

    const timeProvided = eventTime !== undefined || event_time !== undefined;
    const maxProvided = maxParticipants !== undefined || max_participants !== undefined;
    const resolvedUserId =
      userId !== undefined ? parsePositiveIntOrNull(userId) : event.userId;
    const resolvedShelterId = await resolveShelterIdForManager(
      shelterId !== undefined ? shelterId : event.shelterId,
      resolvedUserId,
    );

    await event.update({
      title: title?.trim() || event.title,
      description: description?.trim() || event.description,
      date: date !== undefined ? parseDateOnlyOrNull(date) : event.date,
      eventTime: timeProvided
        ? parseTimeOrNull(eventTime ?? event_time)
        : event.eventTime,
      location: location?.trim() || event.location,
      cost: cost?.trim() || event.cost,
      maxParticipants: maxProvided
        ? parseMaxParticipantsOrNull(maxParticipants ?? max_participants)
        : event.maxParticipants,
      status: nextStatus,
      imageUrl,
      shelterId: resolvedShelterId,
      userId: resolvedUserId,
    });

    console.log('📸 Event updated successfully');
    const [enriched] = await serializeEventsWithStats([event], req);
    console.log('📸 Serialized event:', enriched);
    res.json(enriched);
  } catch (error) {
    console.error('Error updating event:', error);
    if (error?.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    const msg =
      error?.name === 'SequelizeDatabaseError'
        ? error?.parent?.sqlMessage || error?.message
        : error?.message;
    res.status(500).json({
      error: 'Failed to update event',
      message: msg || 'Unknown error',
    });
  }
};

// PUT /api/events/:id/status - Update event status
export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['active', 'inactive', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await assertManagerOwnsEvent(event, req);
    await event.update({ status });

    const [enriched] = await serializeEventsWithStats([event], req);
    res.json(enriched);
  } catch (error) {
    console.error('Error updating event status:', error);
    if (error?.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update event status' });
  }
};

const parsePositiveInt = (value) => {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// GET /api/events/registrations?userId= — event ids the user already joined
export const getUserEventRegistrations = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.query.userId);
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const rows = await EventRegistration.findAll({
      where: {
        userId,
        status: { [Op.in]: ['pending', 'approved'] },
      },
      attributes: ['eventId', 'status'],
    });

    res.json(
      rows.map((row) => ({
        eventId: row.eventId,
        status: row.status,
      })),
    );
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ message: 'Failed to fetch registrations' });
  }
};

// POST /api/events/:id/join — register for an event
export const joinEvent = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.id);
    const userId = parsePositiveInt(req.body?.userId);
    const phone = (req.body?.phone ?? req.body?.contactPhone ?? '').toString().trim();
    const comment = (req.body?.comment ?? '').toString().trim() || null;

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event id' });
    }
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    if (phone.length < 5 || phone.length > 50) {
      return res.status(400).json({
        message: 'Contact phone is required (5–50 characters).',
      });
    }

    const event = await Event.findByPk(eventId);
    if (!event || event.status !== 'active') {
      return res.status(404).json({ message: 'Event not found or not available' });
    }

    const applicant = await BasicUser.findByPk(userId, { attributes: ['id', 'role'] });
    const applicantRole = String(applicant?.role || '').toLowerCase();
    if (applicantRole === 'manager' || applicantRole === 'admin') {
      return res.status(403).json({
        message: 'Shelter managers cannot register for events as participants.',
      });
    }
    if (event.userId && userId === event.userId) {
      return res.status(403).json({
        message: 'Event organizers cannot register for their own events.',
      });
    }

    const existing = await EventRegistration.findOne({
      where: {
        eventId,
        userId,
        status: { [Op.in]: ['pending', 'approved'] },
      },
    });
    if (existing) {
      return res.status(409).json({ message: 'You have already registered for this event.' });
    }

    const participantsCount = await countEligibleParticipants(eventId);
    const max = event.maxParticipants;
    if (max != null && participantsCount >= max) {
      return res.status(403).json({ message: 'Event is full. No spots left.' });
    }

    const registration = await EventRegistration.create({
      eventId,
      userId,
      phone,
      comment,
      status: 'pending',
    });

    await BasicUser.update({ phone }, { where: { id: userId } });

    return res.status(202).json({
      message: 'Registration submitted successfully.',
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        status: registration.status,
      },
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'You have already registered for this event.' });
    }
    console.error('Error joining event:', error);
    res.status(500).json({ message: 'Failed to register for event' });
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

    await assertManagerOwnsEvent(event, req);
    await event.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    if (error?.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
