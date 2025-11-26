import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
  logSyncIssue,
} from '../event-handler-logger.js';

export class ProcessingFailedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ProcessingFailed', event);
    const startTime = Date.now();
    const { imageId, error, userId } = event.data;

    try {
      logEventReceived(eventLogger, 'ProcessingFailed', event);

      eventLogger.warn(
        {
          event: 'image.processing.failed',
          imageId,
          userId,
          errorMessage: error,
        },
        `Image processing failed: ${imageId}`
      );

      // 1. Update image view
      logMongoOperation(eventLogger, 'update', 'processed_images', { userId, imageId });

      const imageStartTime = Date.now();
      await this.processedImageRepository.update(imageId, {
        status: 'failed',
        error_message: error,
      });

      logMongoOperationComplete(eventLogger, 'update', 'processed_images', {
        userId,
        imageId,
        duration: Date.now() - imageStartTime,
      });

      // 2. Update statistics
      logMongoOperation(eventLogger, 'update', 'image_statistics', { userId, imageId });

      const statsStartTime = Date.now();
      const statsUpdate = await this.imageStatsRepository.incrementFailed(userId);

      if (!statsUpdate) {
        logSyncIssue(eventLogger, 'user_statistics_not_found', {
          userId,
          imageId,
          details: 'User statistics not found when processing ProcessingFailed event',
        });
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      logMongoOperationComplete(eventLogger, 'update', 'image_statistics', {
        userId,
        imageId,
        duration: Date.now() - statsStartTime,
      });

      logEventProcessed(eventLogger, 'ProcessingFailed', {
        userId,
        imageId,
        recordsUpdated: 2,
        duration: Date.now() - startTime,
      });
    } catch (handlerError) {
      logEventFailed(eventLogger, 'ProcessingFailed', handlerError);
      throw handlerError; // Re-throw to trigger event requeue
    }
  }
}
