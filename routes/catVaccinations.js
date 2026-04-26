import { Router } from 'express';
import {
  createVaccination,
  deleteVaccination,
  listVaccinations,
  updateVaccination,
} from '../controllers/vaccinationController.js';

const router = Router({ mergeParams: true });

router.get('/', listVaccinations);
router.post('/', createVaccination);
router.put('/:vaccinationId', updateVaccination);
router.delete('/:vaccinationId', deleteVaccination);

export default router;

