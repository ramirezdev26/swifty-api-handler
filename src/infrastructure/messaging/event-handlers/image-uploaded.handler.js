export class ImageUploadedEventHandler {
  constructor(processedImageRepository, userProfileRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, userId, originalUrl, style, size, userEmail } = event.data;

    try {
      // 1. Create processed image view
      await this.processedImageRepository.create({
        image_id: imageId,
        user_id: userId,
        user_email: userEmail,
        original_url: originalUrl,
        style: style,
        size: size,
        status: 'processing',
        created_at: new Date(),
      });

      // 2. Update user profile stats
      const profileUpdate = await this.userProfileRepository.incrementImageCount(userId);
      if (!profileUpdate) {
        throw new Error(`User profile not found for userId: ${userId}. Sync issue detected.`);
      }

      // 3. Update statistics
      const statsUpdate = await this.imageStatsRepository.incrementTotal(userId);
      if (!statsUpdate) {
        throw new Error(`User statistics not found for userId: ${userId}. Sync issue detected.`);
      }

      await this.imageStatsRepository.incrementStyleUsed(userId, style);

      console.log(`[ImageUploadedHandler] Materialized image: ${imageId}`);
    } catch (error) {
      console.error(`[ImageUploadedHandler] Error handling event for image ${imageId}:`, error);
      throw error; // Re-throw to trigger event requeue
    }
  }
}
