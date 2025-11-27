import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
  logSyncIssue,
} from '../event-handler-logger.js';
import {
  eventHandlerDuration,
  eventHandlerExecutions,
  eventHandlerErrors,
} from '../../metrics/event-handlers.metrics.js';
import { readModelLag, readModelFreshness } from '../../metrics/sync.metrics.js';

export class ImageUploadedEventHandler {
  constructor(processedImageRepository, userProfileRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ImageUploaded', event);
    const startTime = Date.now();
    const handlerName = 'ImageUploadedEventHandler';

    try {
      logEventReceived(eventLogger, 'ImageUploaded', event);

      const { imageId, userId, originalUrl, style, size, userEmail, userName } =
        event.data || event;

      // Calcular lag CQRS si el evento incluye timestamp
      if (event.timestamp || event.createdAt) {
        const eventTimestamp = new Date(event.timestamp || event.createdAt).getTime();
        const lag = (Date.now() - eventTimestamp) / 1000;
        readModelLag.observe({ event_type: 'ImageUploaded' }, lag);

        if (lag > 5) {
          eventLogger.warn(
            {
              event: 'sync.high_lag',
              eventType: 'ImageUploaded',
              lag: lag,
            },
            `High sync lag detected: ${lag}s`
          );
        }
      }

      // 1. Create processed image view
      logMongoOperation(eventLogger, 'create', 'processed_images', { imageId, userId });

      const imageStartTime = Date.now();
      await this.processedImageRepository.create({
        image_id: imageId,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        original_url: originalUrl,
        style,
        size,
        status: 'processing',
        created_at: new Date(),
        updated_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'create', 'processed_images', {
        imageId,
        userId,
        duration: Date.now() - imageStartTime,
      });

      // 2. Update user profile
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

      // Métricas de éxito
      const duration = (Date.now() - startTime) / 1000;
      eventHandlerDuration.observe({ handler_name: handlerName }, duration);
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'success' });

      // Actualizar freshness
      readModelFreshness.set({ event_type: 'ImageUploaded' }, Date.now() / 1000);

      logEventProcessed(eventLogger, 'ImageUploaded', {
        userId,
        imageId,
        recordsUpdated: 3,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      // Métricas de error
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'error' });
      eventHandlerErrors.inc({
        handler_name: handlerName,
        error_type: error.constructor.name,
      });

      logEventFailed(eventLogger, 'ImageUploaded', error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
