import { Router } from 'express';
import {
  getCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat,
} from '../controllers/catController.js';

const router = Router();

router.get('/', getCats);
router.get('/:id', getCatById);
router.post('/', createCat);
router.put('/:id', updateCat);
router.delete('/:id', deleteCat);

export default router;