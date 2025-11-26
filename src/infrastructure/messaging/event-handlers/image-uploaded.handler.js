import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
  logSyncIssue,
} from '../event-handler-logger.js';

export class ImageUploadedEventHandler {
  constructor(processedImageRepository, userProfileRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ImageUploaded', event);
    const startTime = Date.now();
    const { imageId, userId, originalUrl, style, size, userEmail, userName } = event.data;

    try {
      logEventReceived(eventLogger, 'ImageUploaded', event);

      // 1. Create processed image view
      logMongoOperation(eventLogger, 'create', 'processed_images', { userId, imageId });

      const imageStartTime = Date.now();
      await this.processedImageRepository.create({
        image_id: imageId,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        original_url: originalUrl,
        style: style,
        size: size,
        status: 'processing',
        created_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'create', 'processed_images', {
        userId,
        imageId,
        duration: Date.now() - imageStartTime,
      });

      // 2. Update user profile stats
      logMongoOperation(eventLogger, 'increment', 'user_profiles', { userId });

      const profileStartTime = Date.now();
      const profileUpdate = await this.userProfileRepository.incrementImageCount(userId);

      if (!profileUpdate) {
        logSyncIssue(eventLogger, 'user_profile_not_found', {
          userId,
          imageId,
          details: 'User profile not found when processing ImageUploaded event',
        });
        throw new Error(`User profile not found for userId: ${userId}. Sync issue detected.`);
      }

      logMongoOperationComplete(eventLogger, 'increment', 'user_profiles', {
        userId,
        duration: Date.now() - profileStartTime,
      });

      // 3. Update statistics
      logMongoOperation(eventLogger, 'update', 'image_statistics', { userId, imageId });

      const statsStartTime = Date.now();
      const statsUpdate = await this.imageStatsRepository.incrementTotal(userId);

      if (!statsUpdate) {
        logSyncIssue(eventLogger, 'user_statistics_not_found', {
          userId,
          imageId,
          details: 'User statistics not found when processing ImageUploaded event',
        });
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      await this.imageStatsRepository.incrementStyleUsed(userId, style);

      logMongoOperationComplete(eventLogger, 'update', 'image_statistics', {
        userId,
        imageId,
        duration: Date.now() - statsStartTime,
      });

      logEventProcessed(eventLogger, 'ImageUploaded', {
        userId,
        imageId,
        recordsUpdated: 3,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logEventFailed(eventLogger, 'ImageUploaded', error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
