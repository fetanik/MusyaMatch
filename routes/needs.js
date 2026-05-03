import { Router } from 'express';
import { createNeed, deleteNeed, getNeeds, updateNeed } from '../controllers/needController.js';

const router = Router();

router.get('/', getNeeds);
router.post('/', createNeed);
router.put('/:id', updateNeed);
router.delete('/:id', deleteNeed);

export default router;
