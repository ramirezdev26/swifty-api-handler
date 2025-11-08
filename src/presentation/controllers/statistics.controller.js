import { GetImageStatisticsQuery } from '../../application/queries/get-image-statistics.query.js';

export class StatisticsController {
  constructor(getImageStatisticsHandler, userProfileRepository) {
    this.getImageStatisticsHandler = getImageStatisticsHandler;
    this.userProfileRepository = userProfileRepository;
  }

  getImageStats = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;

      // Fetch user profile from MongoDB to get user_id
      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);

      if (!userProfile) {
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
      const stats = await this.getImageStatisticsHandler.execute(query);

      return res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}
