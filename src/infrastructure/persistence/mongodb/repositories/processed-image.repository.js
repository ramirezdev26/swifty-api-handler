export class ProcessedImageRepository {
  constructor(processedImageModel) {
    this.model = processedImageModel;
  }

  async create(imageData) {
    return await this.model.create(imageData);
  }

  async findById(imageId) {
    return await this.model.findOne({ image_id: imageId });
  }

  async findByUserId(userId, filters = {}) {
    const query = { user_id: userId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.style) {
      query.style = filters.style;
    }

    return await this.model
      .find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 50);
  }

  async update(imageId, updateData) {
    return await this.model.findOneAndUpdate(
      { image_id: imageId },
      {
        $set: {
          ...updateData,
          updated_at: new Date(),
        },
      },
      { new: true }
    );
  }

  async upsert(imageData) {
    return await this.model.findOneAndUpdate(
      { image_id: imageData.image_id },
      {
        $set: {
          ...imageData,
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }
}
