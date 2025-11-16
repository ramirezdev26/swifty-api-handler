import { Router } from 'express';
import AuthMiddleware from '../middleware/auth.middleware.js';

/**
 * Image Query Routes (Read-Only)
 * Used by Query Service - only GET endpoints
 */
export const createImageRoutes = (imageQueryController) => {
  const router = Router();

  // Public endpoints - no authentication
  router.get('/', imageQueryController.getProcessedImages);

  // Protected endpoint - authentication required
  router.get('/users/me', AuthMiddleware.verifyToken, imageQueryController.getMyImages);

  return router;
};

export default createImageRoutes;
