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

export class ImageProcessedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ImageProcessed', event);
    const startTime = Date.now();
    const handlerName = 'ImageProcessedEventHandler';

    try {
      logEventReceived(eventLogger, 'ImageProcessed', event);

      const { imageId, processed_url, processing_time, userId } = event.data || event;

      // Calcular lag CQRS si el evento incluye timestamp
      if (event.timestamp || event.createdAt || event.processedAt) {
        const eventTimestamp = new Date(
          event.timestamp || event.createdAt || event.processedAt
        ).getTime();
        const lag = (Date.now() - eventTimestamp) / 1000;
        readModelLag.observe({ event_type: 'ImageProcessed' }, lag);

        if (lag > 5) {
          eventLogger.warn(
            {
              event: 'sync.high_lag',
              eventType: 'ImageProcessed',
              lag: lag,
            },
            `High sync lag detected: ${lag}s`
          );
        }
      }

      // 1. Update image view
      logMongoOperation(eventLogger, 'update', 'processed_images', { imageId });

      const imageStartTime = Date.now();
      await this.processedImageRepository.update(imageId, {
        processed_url: processed_url,
        processing_time: processing_time,
        status: 'completed',
        processed_at: new Date(),
        updated_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'update', 'processed_images', {
        imageId,
        duration: Date.now() - imageStartTime,
      });

      // 2. Update statistics
      logMongoOperation(eventLogger, 'update', 'image_statistics', { userId, imageId });

      const statsStartTime = Date.now();
      const statsUpdate = await this.imageStatsRepository.incrementCompleted(userId);

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

      // Métricas de éxito
      const duration = (Date.now() - startTime) / 1000;
      eventHandlerDuration.observe({ handler_name: handlerName }, duration);
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'success' });

      // Actualizar freshness
      readModelFreshness.set({ event_type: 'ImageProcessed' }, Date.now() / 1000);

      logEventProcessed(eventLogger, 'ImageProcessed', {
        userId,
        imageId,
        processingTime: processing_time,
        recordsUpdated: 2,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      // Métricas de error
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'error' });
      eventHandlerErrors.inc({
        handler_name: handlerName,
        error_type: error.constructor.name,
      });

      logEventFailed(eventLogger, 'ImageProcessed', error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
