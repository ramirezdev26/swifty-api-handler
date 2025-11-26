export class GetImageByIdHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();

    logger.debug(
      {
        event: 'query.image-by-id.started',
        imageId: query.imageId,
      },
      'Fetching image by ID from MongoDB'
    );

    const image = await this.processedImageRepository.findById(query.imageId);
    const duration = Date.now() - startTime;

    if (!image) {
      logger.info(
        {
          event: 'query.image-by-id.not-found',
          imageId: query.imageId,
          duration,
        },
        `Image not found: ${query.imageId}`
      );
      return null;
    }

    logger.info(
      {
        event: 'query.image-by-id.completed',
        imageId: query.imageId,
        userId: image.user_id,
        status: image.status,
        duration,
        isSlowQuery: duration > 100,
      },
      `Found image: ${query.imageId}`
    );

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
