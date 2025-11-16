export class GetProcessedImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query) {
    // If query.userId present -> scoped to that user, else global
    const repositoryResult = query.userId
      ? await this.processedImageRepository.findByUserId(query.userId, query.filters)
      : await this.processedImageRepository.findAllProcessed(query.filters);

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
