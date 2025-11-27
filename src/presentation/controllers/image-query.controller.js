import { GetProcessedImagesQuery } from '../../application/queries/get-processed-images.query.js';
import { GetImageByIdQuery } from '../../application/queries/get-image-by-id.query.js';
import { GetUserImagesQuery } from '../../application/queries/get-user-images.query.js';

export class ImageQueryController {
  constructor(
    getProcessedImagesHandler,
    getImageByIdHandler,
    userProfileRepository,
    getUserImagesHandler
  ) {
    this.getProcessedImagesHandler = getProcessedImagesHandler;
    this.getImageByIdHandler = getImageByIdHandler;
    this.userProfileRepository = userProfileRepository;
    this.getUserImagesHandler = getUserImagesHandler;
  }

  getProcessedImages = async (req, res, next) => {
    try {
      const { status, style, limit, page, userId, author } = req.query;

      req.logger.info(
        {
          event: 'controller.get-processed-images.started',
          query: req.query,
        },
        'Processing get processed images request'
      );

      const query = new GetProcessedImagesQuery(userId || null, {
        status: status || 'completed',
        style,
        limit: parseInt(limit) || 12,
        page: parseInt(page) || 1,
        author,
        userId, // used only in global listing case, duplicated intentionally for repository filters
      });

      const result = await this.getProcessedImagesHandler.execute(query, req.logger);

      req.logger.info(
        {
          event: 'controller.get-processed-images.completed',
          resultCount: result.images.length,
          pagination: result.pagination,
        },
        'Processed images retrieved successfully'
      );

      return res.status(200).json({
        message: 'data successfully retrieved',
        data: result.images,
        pagination: result.pagination,
      });
    } catch (error) {
      req.logger.error(
        {
          event: 'controller.get-processed-images.failed',
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to retrieve processed images'
      );
      next(error);
    }
  };

  getImageById = async (req, res, next) => {
    try {
      const { id } = req.params;

      req.logger.info(
        {
          event: 'controller.get-image-by-id.started',
          imageId: id,
        },
        'Processing get image by ID request'
      );

      const query = new GetImageByIdQuery(id);
      const image = await this.getImageByIdHandler.execute(query, req.logger);

      if (!image) {
        req.logger.warn(
          {
            event: 'controller.get-image-by-id.not-found',
            imageId: id,
          },
          `Image not found: ${id}`
        );
        return res.status(404).json({ message: 'Image not found' });
      }

      req.logger.info(
        {
          event: 'controller.get-image-by-id.completed',
          imageId: id,
        },
        'Image retrieved successfully'
      );

      return res.status(200).json(image);
    } catch (error) {
      req.logger.error(
        {
          event: 'controller.get-image-by-id.failed',
          imageId: req.params.id,
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to retrieve image by ID'
      );
      next(error);
    }
  };

  getMyImages = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;
      const {
        page = 1,
        limit = 12,
        style = 'all',
        sortBy = 'newest',
        projectId = 'all',
        visibility = 'all',
      } = req.query;

      req.logger.info(
        {
          event: 'controller.get-my-images.started',
          firebaseUid: firebase_uid,
          query: req.query,
        },
        'Processing get my images request'
      );

      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);
      if (!userProfile) {
        req.logger.warn(
          {
            event: 'controller.get-my-images.user-not-found',
            firebaseUid: firebase_uid,
          },
          'User profile not found'
        );
        return res.status(404).json({ message: 'User profile not found' });
      }

      const query = new GetUserImagesQuery(userProfile.user_id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        style,
        sortBy,
        projectId,
        visibility,
      });

      const result = await this.getUserImagesHandler.execute(query, req.logger);

      req.logger.info(
        {
          event: 'controller.get-my-images.completed',
          userId: userProfile.user_id,
          resultCount: result.images.length,
          pagination: result.pagination,
        },
        'User images retrieved successfully'
      );

      return res.status(200).json({ images: result.images, pagination: result.pagination });
    } catch (error) {
      req.logger.error(
        {
          event: 'controller.get-my-images.failed',
          firebaseUid: req.user?.firebase_uid,
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to retrieve user images'
      );
      next(error);
    }
  };
}

export default ImageQueryController;
