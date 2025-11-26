import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
} from '../event-handler-logger.js';

export class UserRegisteredEventHandler {
  constructor(userProfileRepository, imageStatsRepository) {
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('UserRegistered', event);
    const startTime = Date.now();
    const { userId, email, fullName, firebaseUid } = event.data;

    try {
      logEventReceived(eventLogger, 'UserRegistered', event);

      // Create user profile
      eventLogger.debug(
        {
          event: 'mongodb.upsert.started',
          collection: 'user_profiles',
          userId,
          firebaseUid,
        },
        'Upserting user profile in MongoDB'
      );

      const mongoStartTime = Date.now();
      await this.userProfileRepository.upsert({
        user_id: userId,
        firebase_uid: firebaseUid,
        email: email,
        full_name: fullName,
        total_images: 0,
        total_processing_time: 0,
        last_activity: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'upsert', 'user_profiles', {
        userId,
        duration: Date.now() - mongoStartTime,
      });

      // Initialize statistics for the user
      logMongoOperation(eventLogger, 'create', 'image_statistics', { userId });

      const statsStartTime = Date.now();
      await this.imageStatsRepository.initializeForUser(userId);

      logMongoOperationComplete(eventLogger, 'create', 'image_statistics', {
        userId,
        duration: Date.now() - statsStartTime,
      });

      logEventProcessed(eventLogger, 'UserRegistered', {
        userId,
        recordsUpdated: 2,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logEventFailed(eventLogger, 'UserRegistered', error);
      throw error;
    }
  }
}
