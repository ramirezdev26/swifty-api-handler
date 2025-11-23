export class GetUserProfileHandler {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async execute(query) {
    const profile = await this.userProfileRepository.findByUserId(query.userId);

    if (!profile) {
      return null;
    }

    return {
      uid: profile.user_id,
      firebase_uid: profile.firebase_uid,
      email: profile.email,
      full_name: profile.full_name,
      totalImages: profile.total_images,
      totalProcessingTime: profile.total_processing_time,
      lastActivity: profile.last_activity,
    };
  }
}
