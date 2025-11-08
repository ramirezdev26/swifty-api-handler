export class ImageUploadedEventHandler {
  constructor(processedImageRepository, userProfileRepository, imageStatsRepository) {
    this.processedImageRepository = processedImageRepository;
    this.userProfileRepository = userProfileRepository;
    this.imageStatsRepository = imageStatsRepository;
  }

  async handle(event) {
    const { imageId, userId, originalUrl, style, size, userEmail } = event.data;

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
    await this.userProfileRepository.incrementImageCount(userId);

    // 3. Update statistics
    await this.imageStatsRepository.incrementTotal(userId);
    await this.imageStatsRepository.incrementStyleUsed(userId, style);

    console.log(`[ImageUploadedHandler] Materialized image: ${imageId}`);
  }
}
