import { Router } from 'express';
import { claimAchievement, getAchievementsSummary, redeemDiscount, redeemDiscountV2 } from '../controllers/achievementsController.js';

const router = Router();

router.get('/:userId/summary', getAchievementsSummary);
router.post('/:userId/claim', claimAchievement);
router.post('/:userId/redeem', redeemDiscount);
router.post('/redeem', redeemDiscountV2);

export default router;

