import { Router } from 'express';
import {
  getShelterProfile,
  listShelterRequests,
  updateShelterRequestStatus,
  updateShelterProfile,
} from '../controllers/shelterController.js';

const router = Router();

router.get('/profile/:userId', getShelterProfile);
router.put('/profile/:userId', updateShelterProfile);
router.get('/requests/:userId', listShelterRequests);
router.put('/requests/:requestId', updateShelterRequestStatus);

export default router;