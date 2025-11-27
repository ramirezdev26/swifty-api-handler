export class UserProfileRepository {
  constructor(userProfileModel) {
    this.model = userProfileModel;
  }

  async upsert(profileData) {
    return await this.model.findOneAndUpdate(
      { user_id: profileData.user_id },
      { $set: profileData },
      { upsert: true, new: true }
    );
  }

  async findByUserId(userId) {
    return await this.model.findOne({ user_id: userId });
  }

  async findByFirebaseUid(firebaseUid) {
    return await this.model.findOne({ firebase_uid: firebaseUid });
  }

  async incrementImageCount(userId) {
    return await this.model.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: { total_images: 1 },
        $set: { last_activity: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Count total users in the system
   * Used for aggregated metrics
   */
  async count() {
    return await this.model.countDocuments();
  }
}
