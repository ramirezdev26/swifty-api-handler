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

      const query = new GetProcessedImagesQuery(userId || null, {
        status: status || 'completed',
        style,
        limit: parseInt(limit) || 12,
        page: parseInt(page) || 1,
        author,
        userId, // used only in global listing case, duplicated intentionally for repository filters
      });

      const result = await this.getProcessedImagesHandler.execute(query);

      return res.status(200).json({
        message: 'data successfully retrieved',
        data: result.images,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getImageById = async (req, res, next) => {
    try {
      const { id } = req.params;

      const query = new GetImageByIdQuery(id);
      const image = await this.getImageByIdHandler.execute(query);

      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      return res.status(200).json(image);
    } catch (error) {
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

      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);
      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      const query = new GetUserImagesQuery(userProfile.user_id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 12,
        style,
        sortBy,
        projectId,
        visibility,
      });

      const result = await this.getUserImagesHandler.execute(query);

      return res.status(200).json({ images: result.images, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };
}

export default ImageQueryController;
