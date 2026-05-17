import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  joinEvent,
  getUserEventRegistrations,
} from '../controllers/eventController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, JPG, PNG, GIF, WebP)'));
    }
  },
});

const uploadImageSingle = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    next();
  });
};

const idParam = ':id(\\d+)';

// GET /api/events — list (must stay before /:id routes)
router.get('/', getEvents);

// GET /api/events/registrations — user's event sign-ups (before /:id)
router.get('/registrations', getUserEventRegistrations);

// POST /api/events — create
router.post('/', uploadImageSingle, createEvent);

// POST /api/events/:id/join — user registers for event
router.post(`/${idParam}/join`, joinEvent);

// More specific routes before generic /:id
router.put(`/${idParam}/status`, updateEventStatus);
router.put(`/${idParam}`, uploadImageSingle, updateEvent);
router.delete(`/${idParam}`, deleteEvent);
router.get(`/${idParam}`, getEvent);

export default router;
