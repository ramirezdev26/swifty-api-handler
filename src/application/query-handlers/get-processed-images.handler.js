export class GetProcessedImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();

    logger.debug(
      {
        event: 'query.processed-images.started',
        userId: query.userId,
        filters: query.filters,
      },
      'Fetching processed images from MongoDB'
    );

    // If query.userId present -> scoped to that user, else global
    const repositoryResult = query.userId
      ? await this.processedImageRepository.findByUserId(query.userId, query.filters)
      : await this.processedImageRepository.findAllProcessed(query.filters);

    const duration = Date.now() - startTime;

    logger.info(
      {
        event: 'query.processed-images.completed',
        resultCount: repositoryResult.images.length,
        userId: query.userId,
        filters: query.filters,
        pagination: repositoryResult.pagination,
        duration,
        isSlowQuery: duration > 100,
      },
      `Found ${repositoryResult.images.length} processed images`
    );

    const images = repositoryResult.images.map((img) => ({
      id: img.image_id,
      author: img.user_name || img.user_email?.split('@')[0] || 'Unknown',
      style: img.style,
      processedUrl: img.processed_url,
      processedAt: img.processed_at,
      // Keep extra fields for potential future needs
      originalUrl: img.original_url,
      status: img.status,
      size: img.size,
      processingTime: img.processing_time,
    }));

    return {
      images,
      pagination: repositoryResult.pagination,
    };
  }
}
