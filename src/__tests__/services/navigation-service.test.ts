import { NavigationService } from '@/services/navigation-service';
import NavigationMenu from '@/models/navigation-menu-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the NavigationMenu model
jest.mock('@/models/navigation-menu-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
  },
}));

describe('NavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNavigationMenu', () => {
    it('should create a navigation menu', async () => {
      const mockMenu = {
        _id: 'menu-id-1',
        title: 'Main Menu',
        isDefault: false,
        links: [{ label: 'Home', url: '/' }],
        isActive: true,
      };

      (NavigationMenu.create as jest.Mock).mockResolvedValue(mockMenu);

      const result = await NavigationService.createNavigationMenu({
        title: 'Main Menu',
        links: [{ label: 'Home', url: '/' }],
      });

      expect(NavigationMenu.create).toHaveBeenCalledWith({
        title: 'Main Menu',
        links: [{ label: 'Home', url: '/' }],
      });
      expect(result.title).toBe('Main Menu');
    });

    it('should unset other default menus when creating a default menu', async () => {
      const mockMenu = {
        _id: 'menu-id-2',
        title: 'New Default Menu',
        isDefault: true,
        links: [],
        isActive: true,
      };

      (NavigationMenu.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (NavigationMenu.create as jest.Mock).mockResolvedValue(mockMenu);

      await NavigationService.createNavigationMenu({
        title: 'New Default Menu',
        isDefault: true,
      });

      // Verify that updateMany was called to unset other defaults
      expect(NavigationMenu.updateMany).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false }
      );
    });

    it('should NOT call updateMany when isDefault is false', async () => {
      const mockMenu = {
        _id: 'menu-id-3',
        title: 'Regular Menu',
        isDefault: false,
        links: [],
        isActive: true,
      };

      (NavigationMenu.create as jest.Mock).mockResolvedValue(mockMenu);

      await NavigationService.createNavigationMenu({
        title: 'Regular Menu',
        isDefault: false,
      });

      expect(NavigationMenu.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updateNavigationMenu', () => {
    it('should unset other default menus when setting a menu as default', async () => {
      const mockUpdatedMenu = {
        _id: 'menu-id-1',
        title: 'Updated Menu',
        isDefault: true,
        links: [],
        isActive: true,
      };

      (NavigationMenu.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
      (NavigationMenu.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedMenu);

      await NavigationService.updateNavigationMenu('menu-id-1', { isDefault: true });

      // Verify that updateMany was called to unset other defaults (excluding current menu)
      expect(NavigationMenu.updateMany).toHaveBeenCalledWith(
        { _id: { $ne: 'menu-id-1' }, isDefault: true },
        { isDefault: false }
      );
    });

    it('should NOT call updateMany when isDefault is false', async () => {
      const mockUpdatedMenu = {
        _id: 'menu-id-1',
        title: 'Updated Menu',
        isDefault: false,
        links: [],
        isActive: true,
      };

      (NavigationMenu.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedMenu);

      await NavigationService.updateNavigationMenu('menu-id-1', { isDefault: false });

      expect(NavigationMenu.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getAllNavigationMenus', () => {
    it('should return all menus sorted by createdAt descending', async () => {
      const mockMenus = [
        { _id: '1', title: 'Menu 1' },
        { _id: '2', title: 'Menu 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockMenus);
      (NavigationMenu.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await NavigationService.getAllNavigationMenus();

      expect(NavigationMenu.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockMenus);
    });
  });

  describe('getDefaultNavigationMenu', () => {
    it('should return active default menu', async () => {
      const mockMenu = { _id: '1', isDefault: true, isActive: true };
      (NavigationMenu.findOne as jest.Mock).mockResolvedValue(mockMenu);

      const result = await NavigationService.getDefaultNavigationMenu();

      expect(NavigationMenu.findOne).toHaveBeenCalledWith({ isDefault: true, isActive: true });
      expect(result).toEqual(mockMenu);
    });

    it('should return null if no active default menu exists', async () => {
      (NavigationMenu.findOne as jest.Mock).mockResolvedValue(null);

      const result = await NavigationService.getDefaultNavigationMenu();

      expect(result).toBeNull();
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockMenu = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (NavigationMenu.findById as jest.Mock).mockResolvedValue(mockMenu);

      await NavigationService.toggleActiveStatus('1');

      expect(mockMenu.isActive).toBe(false);
      expect(mockMenu.save).toHaveBeenCalled();
    });

    it('should return null if menu not found', async () => {
      (NavigationMenu.findById as jest.Mock).mockResolvedValue(null);

      const result = await NavigationService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteNavigationMenu', () => {
    it('should delete a menu by ID', async () => {
      const mockMenu = { _id: '1', title: 'Deleted Menu' };
      (NavigationMenu.findByIdAndDelete as jest.Mock).mockResolvedValue(mockMenu);

      const result = await NavigationService.deleteNavigationMenu('1');

      expect(NavigationMenu.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMenu);
    });
  });
});
