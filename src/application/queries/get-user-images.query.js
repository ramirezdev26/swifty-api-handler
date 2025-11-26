export class GetUserImagesQuery {
  constructor(userId, options = {}) {
    this.userId = userId;
    this.options = options; // { page, limit, style, sortBy, projectId, visibility }
  }
}
