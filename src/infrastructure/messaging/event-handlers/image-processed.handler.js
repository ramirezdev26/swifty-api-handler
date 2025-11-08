export class ImageProcessedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, processedUrl, processingTime, userId } = event.data;

    // 1. Update image view
    await this.processedImageRepository.update(imageId, {
      processed_url: processedUrl,
      processing_time: processingTime,
      status: 'completed',
      processed_at: new Date(),
    });

    // 2. Update statistics
    await this.imageStatsRepository.incrementCompleted(userId, processingTime);

    console.log(`[ImageProcessedHandler] Updated image: ${imageId}`);
  }
}
