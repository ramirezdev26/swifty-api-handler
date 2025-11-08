import { GetProcessedImagesQuery } from '../../application/queries/get-processed-images.query.js';
import { GetImageByIdQuery } from '../../application/queries/get-image-by-id.query.js';

export class ImageQueryController {
  constructor(getProcessedImagesHandler, getImageByIdHandler, userProfileRepository) {
    this.getProcessedImagesHandler = getProcessedImagesHandler;
    this.getImageByIdHandler = getImageByIdHandler;
    this.userProfileRepository = userProfileRepository;
  }

  getProcessedImages = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;
      const { status, style, limit } = req.query;

      // Fetch user profile from MongoDB to get user_id
      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);

      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      const query = new GetProcessedImagesQuery(userProfile.user_id, {
        status,
        style,
        limit: parseInt(limit) || 50,
      });

      const images = await this.getProcessedImagesHandler.execute(query);

      return res.status(200).json({ images });
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
}
