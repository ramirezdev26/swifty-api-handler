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

    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const [images, totalItems] = await Promise.all([
      this.model.find(query).sort({ processed_at: -1, created_at: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAllProcessed(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'completed';
    }

    if (filters.style) {
      query.style = filters.style;
    }

    if (filters.userId) {
      query.user_id = filters.userId;
    }
    if (filters.author) {
      query.$or = [
        { user_name: { $regex: filters.author, $options: 'i' } },
        { user_email: { $regex: `^${filters.author}`, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const [images, totalItems] = await Promise.all([
      this.model.find(query).sort({ processed_at: -1, created_at: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    };
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

  async findForUserDashboard(userId, options = {}) {
    const {
      page = 1,
      limit = 12,
      style = 'all',
      sortBy = 'newest',
      projectId = 'all',
      visibility = 'public',
    } = options;

    const query = { user_id: userId };

    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }
    if (style && style !== 'all') {
      query.style = style;
    }
    if (projectId && projectId !== 'all') {
      query.project_name = projectId; // assuming project_name stores project reference
    }

    // Sorting strategies
    const sortMap = {
      newest: { created_at: -1 },
      oldest: { created_at: 1 },
      processed: { processed_at: -1 },
      unprocessed: { processed_at: 1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const skip = (page - 1) * limit;

    const [images, totalItems] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      images,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    };
  }
}
