import { ImageMapper } from '../../mappers/image.mapper.js';

export class GetProcessedImagesUseCase {
  constructor(imageRepository) {
    this.imageRepository = imageRepository;
  }

  async execute(userId, page = 1, limit = 12) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate and normalize page parameter
    const normalizedPage = Math.max(1, parseInt(page) || 1);
    // Validate and normalize limit parameter
    const normalizedLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));

    try {
      const { images, totalCount } = await this.imageRepository.findByUserIdWithPagination(
        userId,
        normalizedPage,
        normalizedLimit,
        'processed'
      );

      // Convert images to response DTOs using existing mapper
      const processedImages = images.map((image) => {
        const dto = ImageMapper.toResponseDTO(image);
        // Add filename for frontend convenience
        const cloudinaryName = image.cloudinary_id
          ? image.cloudinary_id.split('/').pop()
          : image.style;
        return {
          id: dto.imageId,
          filename: `${cloudinaryName}_processed.jpg`,
          style: dto.style,
          processedUrl: dto.processedUrl,
          processedAt: dto.processedAt,
        };
      });

      // Create pagination metadata
      const totalPages = Math.ceil(totalCount / normalizedLimit);
      const pagination = {
        currentPage: normalizedPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: normalizedLimit,
        hasNextPage: normalizedPage < totalPages,
        hasPreviousPage: normalizedPage > 1,
      };

      return {
        message: 'data successfully retrieved',
        data: processedImages,
        pagination,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve processed images: ${error.message}`);
    }
  }
}
