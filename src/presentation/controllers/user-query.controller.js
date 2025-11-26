import { GetUserProfileQuery } from '../../application/queries/get-user-profile.query.js';

export class UserQueryController {
  constructor(getUserProfileHandler, userProfileRepository) {
    this.getUserProfileHandler = getUserProfileHandler;
    this.userProfileRepository = userProfileRepository;
  }

  getProfile = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;

      req.logger.info(
        {
          event: 'controller.get-user-profile.started',
          firebaseUid: firebase_uid,
        },
        'Processing get user profile request'
      );

      // Fetch user profile from MongoDB to get user_id
      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);

      if (!userProfile) {
        req.logger.warn(
          {
            event: 'controller.get-user-profile.not-found',
            firebaseUid: firebase_uid,
          },
          'User profile not found'
        );
        return res.status(404).json({ message: 'User profile not found' });
      }

      const query = new GetUserProfileQuery(userProfile.user_id);
      const profile = await this.getUserProfileHandler.execute(query, req.logger);

      if (!profile) {
        req.logger.warn(
          {
            event: 'controller.get-user-profile.not-found',
            userId: userProfile.user_id,
          },
          'Profile not found'
        );
        return res.status(404).json({ message: 'Profile not found' });
      }

      req.logger.info(
        {
          event: 'controller.get-user-profile.completed',
          userId: userProfile.user_id,
        },
        'User profile retrieved successfully'
      );

      return res.status(200).json(profile);
    } catch (error) {
      req.logger.error(
        {
          event: 'controller.get-user-profile.failed',
          firebaseUid: req.user?.firebase_uid,
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack,
          },
        },
        'Failed to retrieve user profile'
      );
      next(error);
    }
  };
}
