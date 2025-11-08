export class ProcessingFailedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, error, userId } = event.data;

    try {
      // 1. Update image view
      await this.processedImageRepository.update(imageId, {
        status: 'failed',
        error_message: error,
      });

      // 2. Update statistics
      const statsUpdate = await this.imageStatsRepository.incrementFailed(userId);
      if (!statsUpdate) {
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      console.log(`[ProcessingFailedHandler] Marked as failed: ${imageId}`);
    } catch (error) {
      console.error(`[ProcessingFailedHandler] Error handling event for image ${imageId}:`, error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
