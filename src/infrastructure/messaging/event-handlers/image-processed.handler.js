import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
  logSyncIssue,
} from '../event-handler-logger.js';

export class ImageProcessedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ImageProcessed', event);
    const startTime = Date.now();
    const { imageId, processed_url, processing_time, userId } = event.data;

    try {
      logEventReceived(eventLogger, 'ImageProcessed', event);

      // 1. Update image view
      logMongoOperation(eventLogger, 'update', 'processed_images', { userId, imageId });

      const imageStartTime = Date.now();
      await this.processedImageRepository.update(imageId, {
        processed_url: processed_url,
        processing_time: processing_time,
        status: 'completed',
        processed_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'update', 'processed_images', {
        userId,
        imageId,
        duration: Date.now() - imageStartTime,
      });

      // 2. Update statistics
      logMongoOperation(eventLogger, 'update', 'image_statistics', { userId, imageId });

      const statsStartTime = Date.now();
      const statsUpdate = await this.imageStatsRepository.incrementCompleted(
        userId,
        processing_time
      );

      if (!statsUpdate) {
        logSyncIssue(eventLogger, 'user_statistics_not_found', {
          userId,
          imageId,
          details: 'User statistics not found when processing ImageProcessed event',
        });
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      logMongoOperationComplete(eventLogger, 'update', 'image_statistics', {
        userId,
        imageId,
        duration: Date.now() - statsStartTime,
      });

      logEventProcessed(eventLogger, 'ImageProcessed', {
        userId,
        imageId,
        processingTime: processing_time,
        recordsUpdated: 2,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      logEventFailed(eventLogger, 'ImageProcessed', error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
