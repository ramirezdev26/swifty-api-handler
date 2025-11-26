import { GetImageStatisticsQuery } from '../../application/queries/get-image-statistics.query.js';

export class StatisticsController {
  constructor(getImageStatisticsHandler, userProfileRepository) {
    this.getImageStatisticsHandler = getImageStatisticsHandler;
    this.userProfileRepository = userProfileRepository;
  }

  getImageStats = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;

      req.logger.info(
        {
          event: 'controller.get-image-stats.started',
          firebaseUid: firebase_uid,
        },
        'Processing get image statistics request'
      );

      // Fetch user profile from MongoDB to get user_id
      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);

      if (!userProfile) {
        req.logger.warn(
          {
            event: 'controller.get-image-stats.user-not-found',
            firebaseUid: firebase_uid,
          },
          'User profile not found, returning default statistics'
        );
        return res.status(404).json({
          totalImages: 0,
          completedImages: 0,
          failedImages: 0,
          processingImages: 0,
          avgProcessingTime: 0,
          stylesUsed: {},
        });
      }

      const query = new GetImageStatisticsQuery(userProfile.user_id);
      const stats = await this.getImageStatisticsHandler.execute(query, req.logger);

      req.logger.info(
        {
          event: 'controller.get-image-stats.completed',
          userId: userProfile.user_id,
          totalImages: stats.totalImages,
          completedImages: stats.completedImages,
        },
        'Image statistics retrieved successfully'
      );

      return res.status(200).json(stats);
    } catch (error) {
      req.logger.error(
        {
          event: 'controller.get-image-stats.failed',
          firebaseUid: req.user?.firebase_uid,
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to retrieve image statistics'
      );
      next(error);
    }
  };
}
