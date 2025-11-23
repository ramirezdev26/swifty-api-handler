export class GetUserImagesHandler {
  constructor(processedImageRepository) {
    this.processedImageRepository = processedImageRepository;
  }

  async execute(query) {
    const { userId, options } = query;
    const result = await this.processedImageRepository.findForUserDashboard(userId, options);

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
