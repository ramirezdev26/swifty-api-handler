import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './infrastructure/logger/pino.config.js';
import { correlationIdMiddleware } from './presentation/middleware/correlation-id.middleware.js';
import { httpLoggerMiddleware } from './presentation/middleware/http-logger.middleware.js';
import {
  metricsMiddleware,
  errorMetricsMiddleware,
} from './presentation/middleware/metrics.middleware.js';
import { createApiRoutes } from './presentation/routes/api.routes.js';
import { createMetricsRoutes } from './presentation/routes/metrics.routes.js';
import { setupMongooseMetrics } from './infrastructure/persistence/mongodb/instrumented-mongoose.js';
import { AggregatedMetricsService } from './infrastructure/metrics/aggregated-metrics.service.js';
import { setupDependencies } from './infrastructure/config/dependencies.js';
import mongoDBConnection from './infrastructure/persistence/mongodb/connection.js';
import rabbitmqService from './infrastructure/services/rabbitmq.service.js';
import { errorMiddleware } from './presentation/middleware/error.middleware.js';

dotenv.config();

const PORT = process.env.PORT || 3002;
const app = express();

// Setup Mongoose metrics before connecting to MongoDB
setupMongooseMetrics();

logger.info(
  {
    event: 'app.startup',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    metricsEndpoint: `http://localhost:${PORT}/metrics`,
  },
  'swifty-api-handler starting...'
);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Apply correlation ID middleware first
app.use(correlationIdMiddleware);

// Apply metrics middleware
app.use(metricsMiddleware);

// Apply HTTP logger middleware
app.use(httpLoggerMiddleware);

app.use(express.json());

// Health check endpoint (before authentication for easy monitoring)
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    service: 'swifty-api-handler',
    version: process.env.npm_package_version || '1.0.0',
    mongodb: mongoDBConnection.isConnected ? 'connected' : 'disconnected',
    rabbitmq: rabbitmqService.isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };

  req.logger?.debug(
    {
      event: 'health-check',
      status: healthStatus,
    },
    'Health check requested'
  );

  res.json(healthStatus);
});

const startServer = async () => {
  try {
    logger.info(
      {
        event: 'app.initialization.started',
      },
      'Initializing application...'
    );

    // Connect to MongoDB
    logger.info(
      {
        event: 'mongodb.connection.started',
      },
      'Connecting to MongoDB...'
    );
    await mongoDBConnection.connect();
    logger.info(
      {
        event: 'mongodb.connection.success',
      },
      'MongoDB connected successfully'
    );

    // Setup dependencies
    logger.debug(
      {
        event: 'app.dependencies.setup',
      },
      'Setting up dependencies...'
    );
    const {
      eventConsumerService,
      imageQueryController,
      userQueryController,
      statisticsController,
      processedImageRepository,
      userProfileRepository,
    } = setupDependencies();

    // Initialize RabbitMQ connection
    await rabbitmqService.connect();

    // Start event consumer
    await eventConsumerService.init();

    // Setup metrics routes
    const metricsRoutes = createMetricsRoutes();
    app.use('/', metricsRoutes);

    // Setup API routes with dependency injection
    const apiRoutes = createApiRoutes({
      imageQueryController,
      userQueryController,
      statisticsController,
    });

    app.use('/api', apiRoutes);

    // Start aggregated metrics service
    logger.info(
      {
        event: 'metrics.aggregated.starting',
      },
      'Starting aggregated metrics service...'
    );
    const aggregatedMetrics = new AggregatedMetricsService(
      processedImageRepository,
      userProfileRepository
    );
    aggregatedMetrics.startPeriodicUpdate(60000); // Every 1 minute

    // Error middleware (must be after all routes)
    app.use(errorMetricsMiddleware);
    app.use(errorMiddleware);

    app.listen(PORT, () => {
      logger.info(
        {
          event: 'app.startup.completed',
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
        },
        `Query Service running on port ${PORT}`
      );
    });
  } catch (error) {
    logger.fatal(
      {
        event: 'app.startup.failed',
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
      },
      'Failed to initialize application'
    );
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info(
    {
      event: 'app.shutdown.started',
      signal: 'SIGTERM',
    },
    'SIGTERM received, shutting down gracefully'
  );

  try {
    await rabbitmqService.close();
    await mongoDBConnection.disconnect();

    logger.info(
      {
        event: 'app.shutdown.completed',
      },
      'Server shut down gracefully'
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      {
        event: 'app.shutdown.error',
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
      },
      'Error during shutdown'
    );
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info(
    {
      event: 'app.shutdown.started',
      signal: 'SIGINT',
    },
    'SIGINT received, shutting down gracefully'
  );

  try {
    await rabbitmqService.close();
    await mongoDBConnection.disconnect();

    logger.info(
      {
        event: 'app.shutdown.completed',
      },
      'Server shut down gracefully'
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      {
        event: 'app.shutdown.error',
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
      },
      'Error during shutdown'
    );
    process.exit(1);
  }
});

startServer();
