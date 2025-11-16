import mongoose from 'mongoose';

const processedImageSchema = new mongoose.Schema(
  {
    image_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    user_email: String, // Desnormalizado
    user_name: String,
    cloudinary_id: String,
    original_url: String,
    processed_url: String,
    size: Number,
    style: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    processing_time: Number,
    error_message: String,
    processed_at: Date,
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'processed_images',
  }
);

// Índices compuestos para queries frecuentes
processedImageSchema.index({ user_id: 1, status: 1 });
processedImageSchema.index({ user_id: 1, created_at: -1 });

export const ProcessedImageModel = mongoose.model('ProcessedImage', processedImageSchema);
