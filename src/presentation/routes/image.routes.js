import { Router } from 'express';
import AuthMiddleware from '../middleware/auth.middleware.js';

/**
 * Image Query Routes (Read-Only)
 * Used by Query Service - only GET endpoints
 */
export const createImageRoutes = (imageQueryController) => {
  const router = Router();

  // Apply authentication to all routes
  router.use(AuthMiddleware.verifyToken);

  // GET /api/images - List user's processed images (with filters)
  router.get('/', imageQueryController.getProcessedImages);

  // GET /api/images/:id - Get specific image details
  router.get('/:id', imageQueryController.getImageById);

  return router;
};

export default createImageRoutes;
