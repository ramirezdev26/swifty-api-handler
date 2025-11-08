import { Router } from 'express';
import AuthMiddleware from '../middleware/auth.middleware.js';

/**
 * Statistics Query Routes (Read-Only)
 * Used by Query Service - only GET endpoints
 */
export const createStatisticsRoutes = (statisticsController) => {
  const router = Router();

  // Apply authentication to all routes
  router.use(AuthMiddleware.verifyToken);

  // GET /api/stats/images - Get user's image processing statistics
  router.get('/images', statisticsController.getImageStats);

  return router;
};

export default createStatisticsRoutes;
