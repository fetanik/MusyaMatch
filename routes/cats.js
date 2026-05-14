import { Router } from 'express';
import {
  getCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat,
  createFosterRequest,
  getReceivedFosterRequests,
  updateFosterRequestStatus,
} from '../controllers/catController.js';
import { upload } from '../middleware/upload.js';
import catVaccinationsRouter from './catVaccinations.js';

const router = Router();

router.get('/', getCats);
router.get('/:id', getCatById);
router.put('/:id', upload.single('image'), updateCat);
router.delete('/:id', deleteCat);
router.post('/', upload.single('image'), createCat);
router.post('/:id/foster-request', createFosterRequest);
router.use('/:catId/vaccinations', catVaccinationsRouter);
router.get('/foster-requests/received/:userId', getReceivedFosterRequests);
router.patch('/foster-requests/:requestId/status', updateFosterRequestStatus);

export default router;