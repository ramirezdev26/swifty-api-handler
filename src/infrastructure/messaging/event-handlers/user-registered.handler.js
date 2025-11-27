import {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
} from '../event-handler-logger.js';
import {
  eventHandlerDuration,
  eventHandlerExecutions,
  eventHandlerErrors,
} from '../../metrics/event-handlers.metrics.js';
import { readModelLag, readModelFreshness } from '../../metrics/sync.metrics.js';

export class UserRegisteredEventHandler {
  constructor(userProfileRepository, imageStatsRepository) {
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const eventLogger = createEventLogger('UserRegistered', event);
    const startTime = Date.now();
    const handlerName = 'UserRegisteredEventHandler';

    try {
      logEventReceived(eventLogger, 'UserRegistered', event);

      const { userId, email, fullName, firebaseUid } = event.data || event;

      // Calcular lag CQRS si el evento incluye timestamp
      if (event.timestamp || event.createdAt) {
        const eventTimestamp = new Date(event.timestamp || event.createdAt).getTime();
        const lag = (Date.now() - eventTimestamp) / 1000;
        readModelLag.observe({ event_type: 'UserRegistered' }, lag);

        if (lag > 5) {
          eventLogger.warn(
            {
              event: 'sync.high_lag',
              eventType: 'UserRegistered',
              lag: lag,
            },
            `High sync lag detected: ${lag}s`
          );
        }
      }

      // Create/update user profile
      logMongoOperation(eventLogger, 'upsert', 'user_profiles', {
        userId,
        firebaseUid,
      });

      const profileStartTime = Date.now();
      await this.userProfileRepository.upsert({
        user_id: userId,
        firebase_uid: firebaseUid,
        email,
        full_name: fullName,
        created_at: new Date(),
        updated_at: new Date(),
      });

      logMongoOperationComplete(eventLogger, 'upsert', 'user_profiles', {
        userId,
        firebaseUid,
        duration: Date.now() - profileStartTime,
      });

      // Initialize statistics for the user
      logMongoOperation(eventLogger, 'create', 'image_statistics', { userId });

      const statsStartTime = Date.now();
      await this.imageStatsRepository.initializeForUser(userId);

      logMongoOperationComplete(eventLogger, 'create', 'image_statistics', {
        userId,
        duration: Date.now() - statsStartTime,
      });

      // Métricas de éxito
      const duration = (Date.now() - startTime) / 1000;
      eventHandlerDuration.observe({ handler_name: handlerName }, duration);
      eventHandlerExecutions.inc({ handler_name: handlerName, status: 'success' });

      // Actualizar freshness
      readModelFreshness.set({ event_type: 'UserRegistered' }, Date.now() / 1000);

      logEventProcessed(eventLogger, 'UserRegistered', {
        userId,
        firebaseUid,
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

      logEventFailed(eventLogger, 'UserRegistered', error);
      throw error;
    }
  }
}
