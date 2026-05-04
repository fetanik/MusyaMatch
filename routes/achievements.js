import { Router } from 'express';
import { claimAchievement, getAchievementsSummary } from '../controllers/achievementsController.js';

const router = Router();

router.get('/:userId/summary', getAchievementsSummary);
router.post('/:userId/claim', claimAchievement);

export default router;

