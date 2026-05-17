import { Router } from 'express';
import {
  getCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat,
  createFosterRequest,
  getReceivedFosterRequests,
  getSentFosterRequests,
  updateFosterRequestStatus,
  deleteSentFosterRequest,
} from '../controllers/catController.js';
import { upload } from '../middleware/upload.js';
import catVaccinationsRouter from './catVaccinations.js';

const router = Router();

router.get('/', getCats);
router.get('/foster-requests/received/:userId', getReceivedFosterRequests);
router.get('/foster-requests/sent/:userId', getSentFosterRequests);
router.patch('/foster-requests/:requestId/status', updateFosterRequestStatus);
router.delete('/foster-requests/:requestId', deleteSentFosterRequest);
router.get('/:id', getCatById);
router.put('/:id', upload.single('image'), updateCat);
router.delete('/:id', deleteCat);
router.post('/', upload.single('image'), createCat);
router.post('/:id/request', createFosterRequest);
router.post('/:id/foster-request', createFosterRequest);
router.use('/:catId/vaccinations', catVaccinationsRouter);

export default router;
