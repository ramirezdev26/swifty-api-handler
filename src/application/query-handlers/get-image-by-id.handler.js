export class GetImageByIdHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query) {
    const image = await this.processedImageRepository.findById(query.imageId);

    if (!image) {
      return null;
    }

    return {
      imageId: image.image_id,
      userId: image.user_id,
      originalUrl: image.original_url,
      processedUrl: image.processed_url,
      style: image.style,
      status: image.status,
      size: image.size,
      processingTime: image.processing_time,
      errorMessage: image.error_message,
      processedAt: image.processed_at,
      createdAt: image.created_at,
      updatedAt: image.updated_at,
    };
  }
}
