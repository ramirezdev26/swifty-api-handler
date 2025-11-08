export class ProcessingFailedEventHandler {
  constructor(processedImageRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, error, userId } = event.data;

    // 1. Update image view
    await this.processedImageRepository.update(imageId, {
      status: 'failed',
      error_message: error,
    });

    // 2. Update statistics
    await this.imageStatsRepository.incrementFailed(userId);

    console.log(`[ProcessingFailedHandler] Marked as failed: ${imageId}`);
  }
}
