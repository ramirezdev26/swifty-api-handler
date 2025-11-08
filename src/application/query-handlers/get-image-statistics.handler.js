export class GetImageStatisticsHandler {
  constructor(imageStatsRepository) {
    this.imageStatsRepository = imageStatsRepository;
  }

  async execute(query) {
    const stats = await this.imageStatsRepository.findByUserId(query.userId);

    if (!stats) {
      return {
        totalImages: 0,
        completedImages: 0,
        failedImages: 0,
        processingImages: 0,
        avgProcessingTime: 0,
        stylesUsed: {},
      };
    }

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
