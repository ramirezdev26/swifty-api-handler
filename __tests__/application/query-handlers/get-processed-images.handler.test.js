import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GetProcessedImagesHandler } from '../../../src/application/query-handlers/get-processed-images.handler.js';

describe('GetProcessedImagesHandler', () => {
  let handler;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findByUserId: jest.fn(),
    };
    handler = new GetProcessedImagesHandler(mockRepository);
  });

  test('should return processed images for user', async () => {
    const mockImages = [
      {
        image_id: 'img-1',
        user_id: 'user-1',
        original_url: 'https://cloudinary.com/img1.jpg',
        processed_url: 'https://cloudinary.com/img1_processed.jpg',
        style: 'cartoon',
        status: 'completed',
        size: 1024,
        processing_time: 5000,
        processed_at: new Date(),
        created_at: new Date(),
      },
    ];

    mockRepository.findByUserId.mockResolvedValue(mockImages);

    const query = { userId: 'user-1', filters: {} };
    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].imageId).toBe('img-1');
    expect(result[0].status).toBe('completed');
    expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1', {});
  });

  test('should return empty array if no images', async () => {
    mockRepository.findByUserId.mockResolvedValue([]);

    const query = { userId: 'user-1', filters: {} };
    const result = await handler.execute(query);

    expect(result).toEqual([]);
  });

  test('should apply filters correctly', async () => {
    mockRepository.findByUserId.mockResolvedValue([]);

    const query = {
      userId: 'user-1',
      filters: { status: 'completed', style: 'cartoon', limit: 10 },
    };

    await handler.execute(query);

    expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1', {
      status: 'completed',
      style: 'cartoon',
      limit: 10,
    });
  });
});
