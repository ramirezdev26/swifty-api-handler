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
      userId: profile.user_id,
      email: profile.email,
      fullName: profile.full_name,
      totalImages: profile.total_images,
      totalProcessingTime: profile.total_processing_time,
      lastActivity: profile.last_activity,
    };
  }
}
