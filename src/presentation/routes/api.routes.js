import { Router } from 'express';
import { createImageRoutes } from './image.routes.js';
import { createUserRoutes } from './user.routes.js';
import { createStatisticsRoutes } from './statistics.routes.js';

/**
 * API Routes for Query Service
 * All routes are read-only (GET only) and require authentication
 *
 * @param {Object} controllers - Injected controllers
 * @param {Object} controllers.imageQueryController - Image query controller
 * @param {Object} controllers.userQueryController - User query controller
 * @param {Object} controllers.statisticsController - Statistics controller
 * @returns {Router} Configured API router
 */
export const createApiRoutes = (controllers) => {
  const router = Router();

  const { imageQueryController, userQueryController, statisticsController } = controllers;

  // Setup route handlers with dependency injection
  router.use('/images', createImageRoutes(imageQueryController));
  router.use('/users', createUserRoutes(userQueryController));
  router.use('/stats', createStatisticsRoutes(statisticsController));

  return router;
};

export default createApiRoutes;
