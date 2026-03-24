import { Router } from 'express';
import { getCats } from '../controllers/catController.js';

const router = Router();

router.get('/', getCats);

export default router;
