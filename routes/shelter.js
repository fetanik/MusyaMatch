import { Router } from 'express';
import {
  getShelterProfile,
  updateShelterProfile,
} from '../controllers/shelterController.js';

const router = Router();

router.get('/profile/:userId', getShelterProfile);
router.put('/profile/:userId', updateShelterProfile);

export default router;