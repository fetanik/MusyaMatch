import { Router } from 'express';
import {
  claimAchievement,
  getAchievementsSummary,
  redeemMarketplaceDiscount,
} from '../controllers/achievementsController.js';

const router = Router();

/** Literal path first so `POST .../redeem` is never captured as `/:userId/redeem`. */
router.post('/redeem', redeemMarketplaceDiscount);
router.post('/:userId/redeem', redeemMarketplaceDiscount);
router.get('/:userId/summary', getAchievementsSummary);
router.post('/:userId/claim', claimAchievement);

export default router;

