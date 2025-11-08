export class ImageProcessedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, processedUrl, processingTime, userId } = event.data;

    try {
      // 1. Update image view
      await this.processedImageRepository.update(imageId, {
        processed_url: processedUrl,
        processing_time: processingTime,
        status: 'completed',
        processed_at: new Date(),
      });

      // 2. Update statistics
      const statsUpdate = await this.imageStatsRepository.incrementCompleted(
        userId,
        processingTime
      );
      if (!statsUpdate) {
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      console.log(`[ImageProcessedHandler] Updated image: ${imageId}`);
    } catch (error) {
      console.error(`[ImageProcessedHandler] Error handling event for image ${imageId}:`, error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
