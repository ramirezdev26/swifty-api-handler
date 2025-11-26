import crypto from 'crypto';
import { logger } from '../logger/pino.config.js';

/**
 * Event Handler Logger - Specialized logging for RabbitMQ event processing
 * Extracts and propagates trace IDs from events to maintain distributed tracing
 */

/**
 * Creates a logger for event handlers with trace-id from the event
 * @param {string} eventType - Type of event being processed
 * @param {Object} eventData - Event payload/data
 * @returns {Object} Child logger instance with event context
 */
export const createEventLogger = (eventType, eventData) => {
  // Try to extract traceId from various possible locations in the event
  const traceId =
    eventData.traceId ||
    eventData.metadata?.traceId ||
    eventData.correlationId ||
    eventData.data?.traceId ||
    crypto.randomUUID();

  const eventId = eventData.eventId || eventData.id || crypto.randomUUID();

  return logger.child({
    traceId,
    eventId,
    eventType,
    source: 'rabbitmq',
  });
};

/**
 * Log the receipt of an event from RabbitMQ
 * @param {Object} eventLogger - Child logger instance
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event payload
 */
export const logEventReceived = (eventLogger, eventType, eventData) => {
  eventLogger.info(
    {
      event: `event.${eventType}.received`,
      payload: {
        userId: eventData.data?.userId || eventData.userId,
        imageId: eventData.data?.imageId || eventData.imageId,
        // Include other relevant fields without exposing sensitive data
      },
      timestamp: new Date().toISOString(),
    },
    `Event ${eventType} received from RabbitMQ`
  );
};

/**
 * Log successful event processing
 * @param {Object} eventLogger - Child logger instance
 * @param {string} eventType - Type of event
 * @param {Object} result - Processing result with metrics
 */
export const logEventProcessed = (eventLogger, eventType, result) => {
  eventLogger.info(
    {
      event: `event.${eventType}.processed`,
      result: {
        userId: result.userId,
        imageId: result.imageId,
        recordsUpdated: result.recordsUpdated,
      },
      duration: result.duration,
    },
    `Event ${eventType} processed successfully`
  );
};

/**
 * Log event processing failure
 * @param {Object} eventLogger - Child logger instance
 * @param {string} eventType - Type of event
 * @param {Error} error - Error that occurred
 */
export const logEventFailed = (eventLogger, eventType, error) => {
  eventLogger.error(
    {
      event: `event.${eventType}.failed`,
      error: {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    },
    `Event ${eventType} processing failed: ${error.message}`
  );
};

/**
 * Log MongoDB operation within event handler
 * @param {Object} eventLogger - Child logger instance
 * @param {string} operation - MongoDB operation (upsert, update, create)
 * @param {string} collection - Collection name
 * @param {Object} context - Additional context
 */
export const logMongoOperation = (eventLogger, operation, collection, context) => {
  eventLogger.debug(
    {
      event: `mongodb.${operation}`,
      collection,
      userId: context.userId,
      imageId: context.imageId,
    },
    `MongoDB ${operation} on ${collection}`
  );
};

/**
 * Log MongoDB operation completion
 * @param {Object} eventLogger - Child logger instance
 * @param {string} operation - MongoDB operation
 * @param {string} collection - Collection name
 * @param {Object} context - Additional context with duration
 */
export const logMongoOperationComplete = (eventLogger, operation, collection, context) => {
  const level = context.duration > 100 ? 'warn' : 'debug';

  eventLogger[level](
    {
      event: `mongodb.${operation}.completed`,
      collection,
      userId: context.userId,
      imageId: context.imageId,
      duration: context.duration,
    },
    `MongoDB ${operation} completed in ${context.duration}ms`
  );
};

/**
 * Log synchronization issue detection
 * @param {Object} eventLogger - Child logger instance
 * @param {string} issueType - Type of sync issue
 * @param {Object} context - Context about the issue
 */
export const logSyncIssue = (eventLogger, issueType, context) => {
  eventLogger.warn(
    {
      event: 'sync.issue.detected',
      issueType,
      userId: context.userId,
      imageId: context.imageId,
      details: context.details,
    },
    `Synchronization issue detected: ${issueType}`
  );
};

export default {
  createEventLogger,
  logEventReceived,
  logEventProcessed,
  logEventFailed,
  logMongoOperation,
  logMongoOperationComplete,
  logSyncIssue,
};
