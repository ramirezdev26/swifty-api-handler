import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GetProcessedImagesHandler } from '../../../src/application/query-handlers/get-processed-images.handler.js';

describe('GetProcessedImagesHandler', () => {
  let handler;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findByUserId: jest.fn(),
      findAllProcessed: jest.fn(),
    };
    handler = new GetProcessedImagesHandler(mockRepository);
  });

  test('should return processed images for user with pagination', async () => {
    const mockImages = [
      {
        image_id: 'img-1',
        user_id: 'user-1',
        user_name: 'tester',
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

    mockRepository.findByUserId.mockResolvedValue({
      images: mockImages,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const query = { userId: 'user-1', filters: {} };
    const result = await handler.execute(query);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).toBe('img-1');
    expect(result.pagination.totalItems).toBe(1);
    expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1', {});
  });

  test('should return empty images array if none for user', async () => {
    mockRepository.findByUserId.mockResolvedValue({
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

    const query = { userId: 'user-1', filters: {} };
    const result = await handler.execute(query);

    expect(result.images).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });

  test('should apply filters correctly', async () => {
    mockRepository.findByUserId.mockResolvedValue({
      images: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const filters = { status: 'completed', style: 'cartoon', limit: 10 };
    const query = { userId: 'user-1', filters };
    await handler.execute(query);

    expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1', filters);
  });

  test('should perform global listing when no userId provided', async () => {
    mockRepository.findAllProcessed.mockResolvedValue({
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

    const query = { userId: null, filters: { status: 'completed' } };
    await handler.execute(query);

    expect(mockRepository.findAllProcessed).toHaveBeenCalledWith({ status: 'completed' });
  });
});
