import {
  imageQueriesTotal,
  imagesReturned,
} from '../../infrastructure/metrics/business.metrics.js';

export class GetUserImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query, logger) {
    const startTime = Date.now();
    const { userId, filters } = query;

    logger.debug(
      {
        event: 'query.user-images.started',
        userId,
        filters,
      },
      'Fetching user images from MongoDB'
    );

    try {
      const repositoryResult = await this.processedImageRepository.findByUserId(userId, filters);

      const duration = Date.now() - startTime;

      // Métricas de negocio
      imageQueriesTotal.inc({ filter_type: 'by_user', status: 'success' });
      imagesReturned.observe(repositoryResult.images.length);

      logger.info(
        {
          event: 'query.user-images.completed',
          userId,
          resultCount: repositoryResult.images.length,
          filters,
          pagination: repositoryResult.pagination,
          duration,
          isSlowQuery: duration > 100,
        },
        `Found ${repositoryResult.images.length} images for user`
      );

      // Map images to the expected format
      const images = repositoryResult.images.map((img) => ({
        id: img.image_id,
        processed_url: img.processed_url,
        style: img.style,
        project_name: img.project_name,
        processed_at: img.processed_at,
        visibility: img.visibility,
      }));

      return {
        images,
        pagination: repositoryResult.pagination,
      };
    } catch (error) {
      imageQueriesTotal.inc({ filter_type: 'by_user', status: 'error' });
      throw error;
    }
  }
}
