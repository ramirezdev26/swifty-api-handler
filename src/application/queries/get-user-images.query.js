export class GetUserImagesQuery {
  constructor(userId, filters = {}) {
    this.userId = userId;
    this.filters = filters; // { page, limit, style, sortBy, projectId, visibility }
  }
}
