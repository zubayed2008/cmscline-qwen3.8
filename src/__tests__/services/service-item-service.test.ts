import { ServiceItemService } from '@/services/service-item-service';
import ServiceItem from '@/models/service-item-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the ServiceItem model
jest.mock('@/models/service-item-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

describe('ServiceItemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createServiceItem', () => {
    it('should create a service item with required fields', async () => {
      const mockItem = {
        _id: 'service-id-1',
        title: 'Web Development',
        description: 'Full-stack web development services',
        icon: 'fa-code',
        isActive: true,
      };

      (ServiceItem.create as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.createServiceItem({
        title: 'Web Development',
        description: 'Full-stack web development services',
        icon: 'fa-code',
      });

      expect(ServiceItem.create).toHaveBeenCalledWith({
        title: 'Web Development',
        description: 'Full-stack web development services',
        icon: 'fa-code',
      });
      expect(result).toEqual(mockItem);
    });

    it('should create a service item without optional icon', async () => {
      const mockItem = {
        _id: 'service-id-2',
        title: 'Consulting',
        description: 'Business consulting services',
        isActive: true,
      };

      (ServiceItem.create as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.createServiceItem({
        title: 'Consulting',
        description: 'Business consulting services',
      });

      expect(ServiceItem.create).toHaveBeenCalledWith({
        title: 'Consulting',
        description: 'Business consulting services',
      });
      expect(result).toEqual(mockItem);
    });

    it('should create a service item with isActive option', async () => {
      const mockItem = {
        _id: 'service-id-3',
        title: 'Inactive Service',
        description: 'This service is inactive',
        isActive: false,
      };

      (ServiceItem.create as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.createServiceItem({
        title: 'Inactive Service',
        description: 'This service is inactive',
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateServiceItem', () => {
    it('should update a service item by ID', async () => {
      const mockUpdatedItem = {
        _id: 'service-id-1',
        title: 'Updated Web Development',
        description: 'Updated description',
        icon: 'fa-code-updated',
        isActive: true,
      };

      (ServiceItem.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedItem);

      const result = await ServiceItemService.updateServiceItem('service-id-1', {
        title: 'Updated Web Development',
        description: 'Updated description',
      });

      expect(ServiceItem.findByIdAndUpdate).toHaveBeenCalledWith(
        'service-id-1',
        { title: 'Updated Web Development', description: 'Updated description' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should return null if service item not found', async () => {
      (ServiceItem.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await ServiceItemService.updateServiceItem('nonexistent', {
        title: 'Not Found',
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllServiceItems', () => {
    it('should return all service items sorted by createdAt descending', async () => {
      const mockItems = [
        { _id: '1', title: 'Service 1' },
        { _id: '2', title: 'Service 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (ServiceItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ServiceItemService.getAllServiceItems();

      expect(ServiceItem.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockItems);
    });
  });

  describe('getActiveServiceItems', () => {
    it('should return only active service items', async () => {
      const mockItems = [
        { _id: '1', title: 'Active Service', isActive: true },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockItems);
      (ServiceItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ServiceItemService.getActiveServiceItems();

      expect(ServiceItem.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockItems);
    });

    it('should return empty array when no active service items', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      (ServiceItem.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await ServiceItemService.getActiveServiceItems();

      expect(result).toEqual([]);
    });
  });

  describe('getServiceItemById', () => {
    it('should return a service item by ID', async () => {
      const mockItem = { _id: 'service-id-1', title: 'Web Development' };
      (ServiceItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.getServiceItemById('service-id-1');

      expect(ServiceItem.findById).toHaveBeenCalledWith('service-id-1');
      expect(result).toEqual(mockItem);
    });

    it('should return null if service item not found', async () => {
      (ServiceItem.findById as jest.Mock).mockResolvedValue(null);

      const result = await ServiceItemService.getServiceItemById('nonexistent');

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
      (ServiceItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.toggleActiveStatus('1');

      expect(mockItem.isActive).toBe(false);
      expect(mockItem.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockItem = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (ServiceItem.findById as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.toggleActiveStatus('1');

      expect(mockItem.isActive).toBe(true);
      expect(mockItem.save).toHaveBeenCalled();
    });

    it('should return null if service item not found', async () => {
      (ServiceItem.findById as jest.Mock).mockResolvedValue(null);

      const result = await ServiceItemService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteServiceItem', () => {
    it('should delete a service item by ID', async () => {
      const mockItem = { _id: '1', title: 'Deleted Service' };
      (ServiceItem.findByIdAndDelete as jest.Mock).mockResolvedValue(mockItem);

      const result = await ServiceItemService.deleteServiceItem('1');

      expect(ServiceItem.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockItem);
    });

    it('should return null if service item not found', async () => {
      (ServiceItem.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await ServiceItemService.deleteServiceItem('nonexistent');

      expect(result).toBeNull();
    });
  });
});