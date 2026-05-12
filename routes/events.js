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

// GET /api/events - Get all events
router.get('/', getEvents);

// GET /api/events/:id - Get single event
router.get('/:id', getEvent);

// POST /api/events - Create new event
router.post('/', upload.single('image'), createEvent);

// PUT /api/events/:id - Update event
router.put('/:id', upload.single('image'), updateEvent);

// PUT /api/events/:id/status - Update event status
router.put('/:id/status', updateEventStatus);

// DELETE /api/events/:id - Delete event
router.delete('/:id', deleteEvent);

export default router;
