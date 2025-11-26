export class GetUserImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();
    const { userId, options } = query;

    logger.debug(
      {
        event: 'query.user-images.started',
        userId,
        options,
      },
      'Fetching user images from MongoDB'
    );

    const result = await this.processedImageRepository.findForUserDashboard(userId, options);
    const duration = Date.now() - startTime;

    logger.info(
      {
        event: 'query.user-images.completed',
        userId,
        resultCount: result.images.length,
        options,
        pagination: result.pagination,
        duration,
        isSlowQuery: duration > 100,
      },
      `Found ${result.images.length} images for user`
    );

    const images = result.images.map((img) => ({
      id: img.image_id,
      processed_url: img.processed_url || null,
      style: img.style,
      project_name: img.project_name || null,
      processed_at: img.processed_at || null,
      visibility: img.visibility || 'public',
    }));

    return {
      images,
      pagination: result.pagination,
    };
  }
}
