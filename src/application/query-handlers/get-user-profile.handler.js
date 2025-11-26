export class GetUserProfileHandler {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();

    logger.debug(
      {
        event: 'query.user-profile.started',
        userId: query.userId,
      },
      'Fetching user profile from MongoDB'
    );

    const profile = await this.userProfileRepository.findByUserId(query.userId);
    const duration = Date.now() - startTime;

    if (!profile) {
      logger.warn(
        {
          event: 'query.user-profile.not-found',
          userId: query.userId,
          duration,
        },
        `User profile not found: ${query.userId}`
      );
      return null;
    }

    logger.info(
      {
        event: 'query.user-profile.completed',
        userId: query.userId,
        totalImages: profile.total_images,
        duration,
        isSlowQuery: duration > 100,
      },
      `Found user profile: ${query.userId}`
    );

    return {
      uid: profile.user_id,
      firebase_uid: profile.firebase_uid,
      email: profile.email,
      full_name: profile.full_name,
      totalImages: profile.total_images,
      totalProcessingTime: profile.total_processing_time,
      lastActivity: profile.last_activity,
    };
  }
}
