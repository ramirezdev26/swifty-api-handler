export class CreateUserDTO {
  constructor({ email, firebase_uid, full_name = null }) {
    this.email = email;
    this.firebase_uid = firebase_uid;
    this.full_name = full_name;
  }

  static fromRequest(body, firebaseUser) {
    return new CreateUserDTO({
      email: body.email,
      firebase_uid: firebaseUser.firebase_uid,
      full_name: body.full_name,
    });
  }
}

export class UserResponseDTO {
  constructor({ uid, firebase_uid, email, full_name }) {
    this.uid = uid;
    this.firebase_uid = firebase_uid;
    this.email = email;
    this.full_name = full_name;
  }

  toJSON() {
    return {
      uid: this.uid,
      firebase_uid: this.firebase_uid,
      email: this.email,
      full_name: this.full_name,
    };
  }
}
