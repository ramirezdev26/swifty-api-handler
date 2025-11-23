export class UserRegisteredEventHandler {
  constructor(userProfileRepository, imageStatsRepository) {
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { userId, email, fullName, firebaseUid } = event.data;

    try {
      // Create user profile
      await this.userProfileRepository.upsert({
        user_id: userId,
        firebase_uid: firebaseUid,
        email: email,
        full_name: fullName,
        total_images: 0,
        total_processing_time: 0,
        last_activity: new Date(),
      });

      // Initialize statistics for the user
      await this.imageStatsRepository.initializeForUser(userId);

      console.log(`[UserRegisteredHandler] Materialized user profile and statistics: ${userId}`);
    } catch (error) {
      console.error(`[UserRegisteredHandler] Error handling event for user ${userId}:`, error);
      throw error;
    }
  }
}
