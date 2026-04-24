import { Router } from 'express';
import { createCat, createFosterRequest, getCats } from '../controllers/catController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', getCats);
router.post('/', upload.single('image'), createCat);
router.post('/:id/foster-request', createFosterRequest);

export default router;
