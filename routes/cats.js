import { Router } from 'express';
import {
  getCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat,
  createFosterRequest,
} from '../controllers/catController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', getCats);
router.get('/:id', getCatById);
router.put('/:id', upload.single('image'), updateCat);
router.delete('/:id', deleteCat);
router.post('/', upload.single('image'), createCat);
router.post('/:id/foster-request', createFosterRequest);

export default router;