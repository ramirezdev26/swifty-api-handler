import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firebase_uid: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    full_name: String,
    total_images: {
      type: Number,
      default: 0,
    },
    total_processing_time: {
      type: Number,
      default: 0,
    },
    last_activity: Date,
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'user_profiles',
  }
);

export const UserProfileModel = mongoose.model('UserProfile', userProfileSchema);
