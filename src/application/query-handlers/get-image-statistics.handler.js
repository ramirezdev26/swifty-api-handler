export class GetImageStatisticsHandler {
  constructor(imageStatsRepository) {
    this.imageStatsRepository = imageStatsRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();

    logger.debug(
      {
        event: 'query.image-statistics.started',
        userId: query.userId,
      },
      'Fetching image statistics from MongoDB'
    );

    const stats = await this.imageStatsRepository.findByUserId(query.userId);
    const duration = Date.now() - startTime;

    if (!stats) {
      logger.info(
        {
          event: 'query.image-statistics.not-found',
          userId: query.userId,
          duration,
        },
        `No statistics found for user: ${query.userId}, returning defaults`
      );

      return {
        totalImages: 0,
        completedImages: 0,
        failedImages: 0,
        processingImages: 0,
        avgProcessingTime: 0,
        stylesUsed: {},
      };
    }

    logger.info(
      {
        event: 'query.image-statistics.completed',
        userId: query.userId,
        totalImages: stats.total_images,
        completedImages: stats.completed_images,
        duration,
        isSlowQuery: duration > 100,
      },
      `Found statistics for user: ${query.userId}`
    );

    return {
      totalImages: stats.total_images,
      completedImages: stats.completed_images,
      failedImages: stats.failed_images,
      processingImages: stats.processing_images,
      avgProcessingTime: stats.avg_processing_time,
      stylesUsed: Object.fromEntries(stats.styles_used),
    };
  }
}
