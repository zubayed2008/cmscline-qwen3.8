import { CarouselService } from '@/services/carousel-service';
import CarouselItem from '@/models/carousel-item-model';
import dbConnect from '@/utils/db-connect';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the CarouselItem model
jest.mock('@/models/carousel-item-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));

describe('CarouselService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCarouselItem', () => {
    it('should create a carousel item with required fields', async () => {
      const mockItem = {
        _id: 'carousel-id-1',
        title: 'Hero Slide 1',
        imageOrIconUrl: '/images/hero1.jpg',
        type: 'hero',
        order: 0,
        isActive: true,
      };

      (CarouselItem.create as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.createCarouselItem({
        title: 'Hero Slide 1',
        imageOrIconUrl: '/images/hero1.jpg',
        type: 'hero',
      });

      expect(CarouselItem.create).toHaveBeenCalledWith({
        title: 'Hero Slide 1',
        imageOrIconUrl: '/images/hero1.jpg',
        type: 'hero',
      });
      expect(result).toEqual(mockItem);
    });

    it('should create a carousel item with optional order', async () => {
      const mockItem = {
        _id: 'carousel-id-2',
        title: 'Client Logo',
        imageOrIconUrl: '/images/client1.png',
        type: 'client',
        order: 5,
        isActive: true,
      };

      (CarouselItem.create as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.createCarouselItem({
        title: 'Client Logo',
        imageOrIconUrl: '/images/client1.png',
        type: 'client',
        order: 5,
      });

      expect(CarouselItem.create).toHaveBeenCalledWith({
        title: 'Client Logo',
        imageOrIconUrl: '/images/client1.png',
        type: 'client',
        order: 5,
      });
      expect(result.order).toBe(5);
    });
  });

  describe('updateCarouselItem', () => {
    it('should update a carousel item by ID', async () => {
      const mockUpdatedItem = {
        _id: 'carousel-id-1',
        title: 'Updated Hero',
        imageOrIconUrl: '/images/hero-updated.jpg',
        type: 'hero',
        order: 1,
        isActive: true,
      };

      (CarouselItem.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedItem);

      const result = await CarouselService.updateCarouselItem('carousel-id-1', {
        title: 'Updated Hero',
        order: 1,
      });

      expect(CarouselItem.findByIdAndUpdate).toHaveBeenCalledWith(
        'carousel-id-1',
        { title: 'Updated Hero', order: 1 },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should return null if carousel item not found', async () => {
      (CarouselItem.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await CarouselService.updateCarouselItem('nonexistent', {
        title: 'Not Found',
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllCarouselItems', () => {
    it('should return all carousel items sorted by type, order, createdAt', async () => {
      const mockItems = [
        { _id: '1', type: 'hero', order: 0 },
        { _id: '2', type: 'client', order: 1 },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (CarouselItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CarouselService.getAllCarouselItems();

      expect(CarouselItem.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ type: 1, order: 1, createdAt: -1 });
      expect(result).toEqual(mockItems);
    });
  });

  describe('getActiveCarouselItems', () => {
    it('should return only active carousel items', async () => {
      const mockItems = [{ _id: '1', type: 'hero', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (CarouselItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CarouselService.getActiveCarouselItems();

      expect(CarouselItem.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockItems);
    });
  });

  describe('getCarouselItemsByType', () => {
    it('should return carousel items filtered by type', async () => {
      const mockItems = [
        { _id: '1', type: 'hero', order: 0 },
        { _id: '2', type: 'hero', order: 1 },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (CarouselItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CarouselService.getCarouselItemsByType('hero');

      expect(CarouselItem.find).toHaveBeenCalledWith({ type: 'hero' });
      expect(mockSort).toHaveBeenCalledWith({ order: 1, createdAt: -1 });
      expect(result).toEqual(mockItems);
    });
  });

  describe('getActiveCarouselItemsByType', () => {
    it('should return active carousel items filtered by type', async () => {
      const mockItems = [{ _id: '1', type: 'client', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (CarouselItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CarouselService.getActiveCarouselItemsByType('client');

      expect(CarouselItem.find).toHaveBeenCalledWith({ type: 'client', isActive: true });
      expect(result).toEqual(mockItems);
    });
  });

  describe('getCarouselItemById', () => {
    it('should return a carousel item by ID', async () => {
      const mockItem = { _id: 'carousel-id-1', title: 'Hero Slide' };
      (CarouselItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.getCarouselItemById('carousel-id-1');

      expect(CarouselItem.findById).toHaveBeenCalledWith('carousel-id-1');
      expect(result).toEqual(mockItem);
    });

    it('should return null if not found', async () => {
      (CarouselItem.findById as jest.Mock).mockResolvedValue(null);

      const result = await CarouselService.getCarouselItemById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockItem = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (CarouselItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.toggleActiveStatus('1');

      expect(mockItem.isActive).toBe(false);
      expect(mockItem.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockItem = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (CarouselItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.toggleActiveStatus('1');

      expect(mockItem.isActive).toBe(true);
      expect(mockItem.save).toHaveBeenCalled();
    });

    it('should return null if carousel item not found', async () => {
      (CarouselItem.findById as jest.Mock).mockResolvedValue(null);

      const result = await CarouselService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteCarouselItem', () => {
    it('should delete a carousel item by ID', async () => {
      const mockItem = { _id: '1', title: 'Deleted Item' };
      (CarouselItem.findByIdAndDelete as jest.Mock).mockResolvedValue(mockItem);

      const result = await CarouselService.deleteCarouselItem('1');

      expect(CarouselItem.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockItem);
    });

    it('should return null if carousel item not found', async () => {
      (CarouselItem.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await CarouselService.deleteCarouselItem('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('reorderCarouselItems', () => {
    it('should call bulkWrite with correct operations', async () => {
      (CarouselItem.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

      const orderList = [
        { id: 'item-1', order: 0 },
        { id: 'item-2', order: 1 },
      ];

      await CarouselService.reorderCarouselItems('hero', orderList);

      expect(CarouselItem.bulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: 'item-1', type: 'hero' },
            update: { order: 0 },
          },
        },
        {
          updateOne: {
            filter: { _id: 'item-2', type: 'hero' },
            update: { order: 1 },
          },
        },
      ]);
    });

    it('should not call bulkWrite if orderList is empty', async () => {
      await CarouselService.reorderCarouselItems('hero', []);

      expect(CarouselItem.bulkWrite).not.toHaveBeenCalled();
    });
  });
});
