import { UserProfileModel } from '../persistence/mongodb/schemas/user-profile.schema.js';
import { ProcessedImageModel } from '../persistence/mongodb/schemas/processed-image.schema.js';
import { ImageStatisticsModel } from '../persistence/mongodb/schemas/image-statistics.schema.js';

import { UserProfileRepository } from '../persistence/mongodb/repositories/user-profile.repository.js';
import { ProcessedImageRepository } from '../persistence/mongodb/repositories/processed-image.repository.js';
import { ImageStatisticsRepository } from '../persistence/mongodb/repositories/image-statistics.repository.js';

import { UserRegisteredEventHandler } from '../messaging/event-handlers/user-registered.handler.js';
import { ImageUploadedEventHandler } from '../messaging/event-handlers/image-uploaded.handler.js';
import { ImageProcessedEventHandler } from '../messaging/event-handlers/image-processed.handler.js';
import { ProcessingFailedEventHandler } from '../messaging/event-handlers/processing-failed.handler.js';

import { GetProcessedImagesHandler } from '../../application/query-handlers/get-processed-images.handler.js';
import { GetImageByIdHandler } from '../../application/query-handlers/get-image-by-id.handler.js';
import { GetUserProfileHandler } from '../../application/query-handlers/get-user-profile.handler.js';
import { GetImageStatisticsHandler } from '../../application/query-handlers/get-image-statistics.handler.js';
import { GetUserImagesHandler } from '../../application/query-handlers/get-user-images.handler.js';

import { ImageQueryController } from '../../presentation/controllers/image-query.controller.js';
import { UserQueryController } from '../../presentation/controllers/user-query.controller.js';
import { StatisticsController } from '../../presentation/controllers/statistics.controller.js';

import { EventConsumerService } from '../messaging/event-consumer.service.js';
import rabbitmqService from '../services/rabbitmq.service.js';

export const setupDependencies = () => {
  // Repositories
  const userProfileRepository = new UserProfileRepository(UserProfileModel);
  const processedImageRepository = new ProcessedImageRepository(ProcessedImageModel);
  const imageStatsRepository = new ImageStatisticsRepository(ImageStatisticsModel);

  // Event Handlers
  const userRegisteredHandler = new UserRegisteredEventHandler(
    userProfileRepository,
    imageStatsRepository
  );
  const imageUploadedHandler = new ImageUploadedEventHandler(
    processedImageRepository,
    userProfileRepository,
    imageStatsRepository
  );
  const imageProcessedHandler = new ImageProcessedEventHandler(
    processedImageRepository,
    imageStatsRepository
  );
  const processingFailedHandler = new ProcessingFailedEventHandler(
    processedImageRepository,
    imageStatsRepository
  );

  // Event Handler Map
  const eventHandlers = new Map([
    ['UserRegisteredEvent', userRegisteredHandler],
    ['user.registered', userRegisteredHandler],
    ['ImageUploadedEvent', imageUploadedHandler],
    ['image.uploaded', imageUploadedHandler],
    ['ImageProcessedEvent', imageProcessedHandler],
    ['image.processed', imageProcessedHandler],
    ['ProcessingFailedEvent', processingFailedHandler],
    ['image.failed', processingFailedHandler],
  ]);

  // Event Consumer
  const eventConsumerService = new EventConsumerService(rabbitmqService, eventHandlers);

  // Query Handlers
  const getProcessedImagesHandler = new GetProcessedImagesHandler(processedImageRepository);
  const getImageByIdHandler = new GetImageByIdHandler(processedImageRepository);
  const getUserProfileHandler = new GetUserProfileHandler(userProfileRepository);
  const getImageStatisticsHandler = new GetImageStatisticsHandler(imageStatsRepository);
  const getUserImagesHandler = new GetUserImagesHandler(processedImageRepository);

  // Controllers
  const imageQueryController = new ImageQueryController(
    getProcessedImagesHandler,
    getImageByIdHandler,
    userProfileRepository,
    getUserImagesHandler
  );
  const userQueryController = new UserQueryController(getUserProfileHandler, userProfileRepository);
  const statisticsController = new StatisticsController(
    getImageStatisticsHandler,
    userProfileRepository
  );

  return {
    eventConsumerService,
    imageQueryController,
    userQueryController,
    statisticsController,
    userProfileRepository,
    processedImageRepository,
    imageStatsRepository,
  };
};
