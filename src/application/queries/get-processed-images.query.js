export class GetProcessedImagesQuery {
  constructor(userId, filters = {}) {
    this.userId = userId;
    this.filters = filters; // { status, style, limit }
  }
}
