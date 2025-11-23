import mongoose from 'mongoose';

const imageStatisticsSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    total_images: {
      type: Number,
      default: 0,
    },
    completed_images: {
      type: Number,
      default: 0,
    },
    failed_images: {
      type: Number,
      default: 0,
    },
    processing_images: {
      type: Number,
      default: 0,
    },
    avg_processing_time: {
      type: Number,
      default: 0,
    },
    styles_used: {
      type: Map,
      of: Number,
      default: {},
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'image_statistics',
  }
);

export const ImageStatisticsModel = mongoose.model('ImageStatistics', imageStatisticsSchema);
