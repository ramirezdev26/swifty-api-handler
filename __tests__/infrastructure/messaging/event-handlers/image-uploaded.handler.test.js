import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ImageUploadedEventHandler } from '../../../../src/infrastructure/messaging/event-handlers/image-uploaded.handler.js';

describe('ImageUploadedEventHandler', () => {
  let handler;
  let mockImageRepo;
  let mockUserRepo;
  let mockStatsRepo;

  beforeEach(() => {
    mockImageRepo = { create: jest.fn() };
    mockUserRepo = { incrementImageCount: jest.fn() };
    mockStatsRepo = {
      incrementTotal: jest.fn(),
      incrementStyleUsed: jest.fn(),
    };

    handler = new ImageUploadedEventHandler(mockImageRepo, mockUserRepo, mockStatsRepo);
  });

  test('should materialize image view', async () => {
    const event = {
      type: 'ImageUploadedEvent',
      data: {
        imageId: 'img-1',
        userId: 'user-1',
        originalUrl: 'https://cloudinary.com/img.jpg',
        style: 'cartoon',
        size: 1024,
        userEmail: 'test@test.com',
      },
    };

    // Mock return values to pass null checks in handler
    mockImageRepo.create.mockResolvedValue({ image_id: 'img-1' });
    mockUserRepo.incrementImageCount.mockResolvedValue({ user_id: 'user-1' });
    mockStatsRepo.incrementTotal.mockResolvedValue({ user_id: 'user-1' });
    mockStatsRepo.incrementStyleUsed.mockResolvedValue({ user_id: 'user-1' });

    await handler.handle(event);

    expect(mockImageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        image_id: 'img-1',
        user_id: 'user-1',
        status: 'processing',
      })
    );
    expect(mockUserRepo.incrementImageCount).toHaveBeenCalledWith('user-1');
    expect(mockStatsRepo.incrementTotal).toHaveBeenCalledWith('user-1');
    expect(mockStatsRepo.incrementStyleUsed).toHaveBeenCalledWith('user-1', 'cartoon');
  });

  test('should handle event with all data fields', async () => {
    const event = {
      type: 'ImageUploadedEvent',
      data: {
        imageId: 'img-2',
        userId: 'user-2',
        originalUrl: 'https://cloudinary.com/img2.jpg',
        style: 'watercolor',
        size: 2048,
        userEmail: 'user@example.com',
      },
    };

    mockImageRepo.create.mockResolvedValue({ image_id: 'img-2' });
    mockUserRepo.incrementImageCount.mockResolvedValue({});
    mockStatsRepo.incrementTotal.mockResolvedValue({});
    mockStatsRepo.incrementStyleUsed.mockResolvedValue({});

    await handler.handle(event);

    expect(mockImageRepo.create).toHaveBeenCalledTimes(1);
    expect(mockUserRepo.incrementImageCount).toHaveBeenCalledTimes(1);
    expect(mockStatsRepo.incrementTotal).toHaveBeenCalledTimes(1);
    expect(mockStatsRepo.incrementStyleUsed).toHaveBeenCalledWith('user-2', 'watercolor');
  });

  test('should throw error when user profile not found', async () => {
    const event = {
      type: 'ImageUploadedEvent',
      data: {
        imageId: 'img-3',
        userId: 'user-3',
        originalUrl: 'https://cloudinary.com/img3.jpg',
        style: 'sketch',
        size: 512,
        userEmail: 'nonexistent@example.com',
      },
    };

    mockImageRepo.create.mockResolvedValue({ image_id: 'img-3' });
    mockUserRepo.incrementImageCount.mockResolvedValue(null); // User not found

    await expect(handler.handle(event)).rejects.toThrow(
      'User profile not found for userId: user-3'
    );
  });

  test('should throw error when statistics not found', async () => {
    const event = {
      type: 'ImageUploadedEvent',
      data: {
        imageId: 'img-4',
        userId: 'user-4',
        originalUrl: 'https://cloudinary.com/img4.jpg',
        style: 'pencil',
        size: 256,
        userEmail: 'user4@example.com',
      },
    };

    mockImageRepo.create.mockResolvedValue({ image_id: 'img-4' });
    mockUserRepo.incrementImageCount.mockResolvedValue({ user_id: 'user-4' }); // Profile exists
    mockStatsRepo.incrementTotal.mockResolvedValue(null); // Stats not found

    await expect(handler.handle(event)).rejects.toThrow(
      'User statistics not found for userId: user-4'
    );
  });
});
