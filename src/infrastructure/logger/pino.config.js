import pino from 'pino';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from VERSION file
let version = '1.0.0';
try {
  const versionPath = join(__dirname, '../../../VERSION');
  version = readFileSync(versionPath, 'utf-8').trim();
} catch (error) {
  console.warn('Could not read VERSION file, using default version');
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

/**
 * Pino Logger Configuration for Query Service
 * Structured logging with correlation IDs and event tracking
 */
const pinoConfig = {
  level: logLevel,
  base: {
    service: 'swifty-api-handler',
    version,
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.params,
      query: req.query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type'),
        'x-trace-id': res.getHeader('x-trace-id'),
      },
    }),
    err: pino.stdSerializers.err,
    error: (error) => ({
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
};

// Add pretty printing in development
if (isDevelopment && process.env.LOG_PRETTY !== 'false') {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{msg} | {event} | traceId: {traceId}',
    },
  };
}

export const logger = pino(pinoConfig);

/**
 * Create a child logger with additional context
 * @param {Object} context - Additional context to include in logs
 * @returns {Object} Child logger instance
 */
export const createChildLogger = (context) => {
  return logger.child(context);
};

/**
 * Log levels available
 */
export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
};

export default logger;
