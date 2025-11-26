import crypto from 'crypto';
import { logger } from '../../infrastructure/logger/pino.config.js';

/**
 * Correlation ID Middleware
 * Generates or propagates trace IDs for distributed tracing
 * Attaches a child logger to each request with traceId and userId context
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Extract or generate trace ID
  const traceId =
    req.headers['x-trace-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();

  // Attach traceId to request for downstream use
  req.traceId = traceId;

  // Create child logger with request context
  // userId will be added by auth middleware if available
  req.logger = logger.child({
    traceId,
    userId: req.user?.uid || req.user?.firebase_uid,
  });

  // Propagate trace ID in response headers
  res.setHeader('X-Trace-Id', traceId);

  next();
};

export default correlationIdMiddleware;
