export class UserRegisteredEventHandler {
  constructor(userProfileRepository) {
    this.userProfileRepository = userProfileRepository;
  }

  async handle(event) {
    const { userId, email, fullName, firebaseUid } = event.data;

    await this.userProfileRepository.upsert({
      user_id: userId,
      firebase_uid: firebaseUid,
      email: email,
      full_name: fullName,
      total_images: 0,
      total_processing_time: 0,
      last_activity: new Date(),
    });

    console.log(`[UserRegisteredHandler] Materialized user profile: ${userId}`);
  }
}
