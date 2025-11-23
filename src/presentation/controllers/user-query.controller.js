import { GetUserProfileQuery } from '../../application/queries/get-user-profile.query.js';

export class UserQueryController {
  constructor(getUserProfileHandler, userProfileRepository) {
    this.getUserProfileHandler = getUserProfileHandler;
    this.userProfileRepository = userProfileRepository;
  }

  getProfile = async (req, res, next) => {
    try {
      const { firebase_uid } = req.user;

      // Fetch user profile from MongoDB to get user_id
      const userProfile = await this.userProfileRepository.findByFirebaseUid(firebase_uid);

      if (!userProfile) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      const query = new GetUserProfileQuery(userProfile.user_id);
      const profile = await this.getUserProfileHandler.execute(query);

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      return res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  };
}
