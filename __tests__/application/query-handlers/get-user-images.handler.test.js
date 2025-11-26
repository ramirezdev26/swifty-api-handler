import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GetUserImagesHandler } from '../../../src/application/query-handlers/get-user-images.handler.js';

describe('GetUserImagesHandler', () => {
  let handler;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findForUserDashboard: jest.fn(),
    };
    handler = new GetUserImagesHandler(mockRepository);
  });

  test('should return user images with pagination and mapping', async () => {
    const now = new Date();
    mockRepository.findForUserDashboard.mockResolvedValue({
      images: [
        {
          image_id: 'img-1',
          processed_url: 'https://example.com/img-1.jpg',
          style: 'anime',
          project_name: null,
          processed_at: now,
          visibility: 'public',
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const query = { userId: 'user-1', options: { page: 1 } };
    const result = await handler.execute(query);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).toBe('img-1');
    expect(result.pagination.totalItems).toBe(1);
    expect(mockRepository.findForUserDashboard).toHaveBeenCalledWith('user-1', { page: 1 });
  });

  test('should handle empty result set', async () => {
    mockRepository.findForUserDashboard.mockResolvedValue({
      images: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const query = { userId: 'user-1', options: { page: 1 } };
    const result = await handler.execute(query);

    expect(result.images).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });
});
