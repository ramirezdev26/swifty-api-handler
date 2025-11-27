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

export class ProcessingFailedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('ProcessingFailed', event);
    const startTime = Date.now();
    const handlerName = 'ProcessingFailedEventHandler';

    try {
      logEventReceived(eventLogger, 'ProcessingFailed', event);

      const { imageId, error, userId } = event.data || event;

      // Calcular lag CQRS si el evento incluye timestamp
      if (event.timestamp || event.createdAt) {
        const eventTimestamp = new Date(event.timestamp || event.createdAt).getTime();
        const lag = (Date.now() - eventTimestamp) / 1000;
        readModelLag.observe({ event_type: 'ProcessingFailed' }, lag);

        if (lag > 5) {
          eventLogger.warn(
            {
              event: 'sync.high_lag',
              eventType: 'ProcessingFailed',
              lag: lag,
            },
            `High sync lag detected: ${lag}s`
          );
        }
      }

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
        updated_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'update', 'processed_images', {
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

      // Métricas de éxito
      const duration = (Date.now() - startTime) / 1000;
      eventHandlerDuration.observe({ handler_name: handlerName }, duration);
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'success' });

      // Actualizar freshness
      readModelFreshness.set({ event_type: 'ProcessingFailed' }, Date.now() / 1000);

      logEventProcessed(eventLogger, 'ProcessingFailed', {
        userId,
        imageId,
        recordsUpdated: 2,
        duration: Date.now() - startTime,
      });
    } catch (handlerError) {
      // Métricas de error
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'error' });
      eventHandlerErrors.inc({
        handler_name: handlerName,
        error_type: handlerError.constructor.name,
      });

      logEventFailed(eventLogger, 'ProcessingFailed', handlerError);
      throw handlerError; // Re-throw to trigger event requeue
    }
  }
}
