import express from 'express';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import errorMiddleware from './presentation/middleware/error.middleware.js';
import mongoDBConnection from './infrastructure/persistence/mongodb/connection.js';
import rabbitmqService from './infrastructure/services/rabbitmq.service.js';
import { setupDependencies } from './infrastructure/config/dependencies.js';
import { createApiRoutes } from './presentation/routes/api.routes.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3002;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  logger.debug('Headers:', req.headers);
  next();
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'query',
    mongodb: mongoDBConnection.isConnected(),
  });
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoDBConnection.connect();
    logger.info('[MongoDB] Connected successfully');

    // Setup dependencies
    const {
      eventConsumerService,
      imageQueryController,
      userQueryController,
      statisticsController,
    } = setupDependencies();

    // Initialize RabbitMQ connection
    await rabbitmqService.connect();
    logger.info('[RabbitMQ] Connected successfully');

    // Start event consumer
    await eventConsumerService.start();
    logger.info('[EventConsumer] Started successfully');

    // Setup API routes with dependency injection
    const apiRoutes = createApiRoutes({
      imageQueryController,
      userQueryController,
      statisticsController,
    });

    app.use('/api', apiRoutes);

    // Error middleware (must be after all routes)
    app.use(errorMiddleware);

    app.listen(PORT, () => {
      logger.info(`[Query Service] Running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await rabbitmqService.close();
  await mongoDBConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await rabbitmqService.close();
  await mongoDBConnection.disconnect();
  process.exit(0);
});

startServer();
