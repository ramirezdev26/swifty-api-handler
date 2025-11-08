export class GetProcessedImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query) {
    const images = await this.processedImageRepository.findByUserId(query.userId, query.filters);

    return images.map((img) => ({
      imageId: img.image_id,
      userId: img.user_id,
      originalUrl: img.original_url,
      processedUrl: img.processed_url,
      style: img.style,
      status: img.status,
      size: img.size,
      processingTime: img.processing_time,
      processedAt: img.processed_at,
      createdAt: img.created_at,
    }));
  }
}
