export class ImageStatisticsRepository {
  constructor(imageStatisticsModel) {
    this.model = imageStatisticsModel;
  }

  async findByUserId(userId) {
    return await this.model.findOne({ user_id: userId });
  }

  async incrementTotal(userId) {
    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: { total_images: 1, processing_images: 1 },
        $set: { last_updated: new Date() },
      },
      { new: true }
    );
  }

  async incrementCompleted(userId, processingTime) {
    const stats = await this.model.findOne({ user_id: userId });

    let newAvg = processingTime;
    if (stats && stats.completed_images > 0) {
      newAvg =
        (stats.avg_processing_time * stats.completed_images + processingTime) /
        (stats.completed_images + 1);
    }

    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: {
          completed_images: 1,
          processing_images: -1,
        },
        $set: {
          avg_processing_time: Math.round(newAvg),
          last_updated: new Date(),
        },
      },
      { new: true }
    );
  }

  async incrementFailed(userId) {
    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: {
          failed_images: 1,
          processing_images: -1,
        },
        $set: { last_updated: new Date() },
      },
      { new: true }
    );
  }

  async incrementStyleUsed(userId, style) {
    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: { [`styles_used.${style}`]: 1 },
        $set: { last_updated: new Date() },
      },
      { new: true }
    );
  }

  async initializeForUser(userId) {
    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $setOnInsert: {
          user_id: userId,
          total_images: 0,
          completed_images: 0,
          failed_images: 0,
          processing_images: 0,
          avg_processing_time: 0,
          styles_used: new Map(),
          last_updated: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }
}
