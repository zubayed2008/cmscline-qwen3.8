import { CategoryService, TagService } from '@/services/taxonomy-service';
import Category from '@/models/category-model';
import Tag from '@/models/tag-model';

// Mock the database connection
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock the Category model
jest.mock('@/models/category-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// Mock the Tag model
jest.mock('@/models/tag-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

describe('CategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create a category with lowercase slug', async () => {
      const mockCategory = {
        _id: 'category-id-1',
        name: 'Technology',
        slug: 'technology',
        isActive: true,
      };

      (Category.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.createCategory({
        name: 'Technology',
        slug: 'TECHNOLOGY',
      });

      expect(Category.create).toHaveBeenCalledWith({
        name: 'Technology',
        slug: 'technology',
      });
      expect(result.slug).toBe('technology');
    });

    it('should create a category with isActive option', async () => {
      const mockCategory = {
        _id: 'category-id-2',
        name: 'Inactive Category',
        slug: 'inactive-category',
        isActive: false,
      };

      (Category.create as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.createCategory({
        name: 'Inactive Category',
        slug: 'inactive-category',
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateCategory', () => {
    it('should update a category with lowercase slug', async () => {
      const mockUpdatedCategory = {
        _id: 'category-id-1',
        name: 'Updated Technology',
        slug: 'updated-technology',
        isActive: true,
      };

      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedCategory);

      const result = await CategoryService.updateCategory('category-id-1', {
        name: 'Updated Technology',
        slug: 'UPDATED-TECHNOLOGY',
      });

      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
        'category-id-1',
        { name: 'Updated Technology', slug: 'updated-technology' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should update a category without slug change', async () => {
      const mockUpdatedCategory = {
        _id: 'category-id-1',
        name: 'Updated Name',
        slug: 'technology',
        isActive: true,
      };

      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedCategory);

      const result = await CategoryService.updateCategory('category-id-1', {
        name: 'Updated Name',
      });

      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
        'category-id-1',
        { name: 'Updated Name' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should return null if category not found', async () => {
      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await CategoryService.updateCategory('nonexistent', {
        name: 'Not Found',
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories sorted by createdAt descending', async () => {
      const mockCategories = [
        { _id: '1', name: 'Category 1' },
        { _id: '2', name: 'Category 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockCategories);
      (Category.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CategoryService.getAllCategories();

      expect(Category.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getActiveCategories', () => {
    it('should return only active categories', async () => {
      const mockCategories = [{ _id: '1', name: 'Active Category', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockCategories);
      (Category.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await CategoryService.getActiveCategories();

      expect(Category.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by ID', async () => {
      const mockCategory = { _id: 'category-id-1', name: 'Technology' };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.getCategoryById('category-id-1');

      expect(Category.findById).toHaveBeenCalledWith('category-id-1');
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found', async () => {
      (Category.findById as jest.Mock).mockResolvedValue(null);

      const result = await CategoryService.getCategoryById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCategoryBySlug', () => {
    it('should find category by lowercase slug', async () => {
      const mockCategory = { _id: '1', slug: 'technology' };
      (Category.findOne as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.getCategoryBySlug('TECHNOLOGY');

      expect(Category.findOne).toHaveBeenCalledWith({ slug: 'technology' });
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found by slug', async () => {
      (Category.findOne as jest.Mock).mockResolvedValue(null);

      const result = await CategoryService.getCategoryBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockCategory = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.toggleActiveStatus('1');

      expect(mockCategory.isActive).toBe(false);
      expect(mockCategory.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockCategory = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.toggleActiveStatus('1');

      expect(mockCategory.isActive).toBe(true);
      expect(mockCategory.save).toHaveBeenCalled();
    });

    it('should return null if category not found', async () => {
      (Category.findById as jest.Mock).mockResolvedValue(null);

      const result = await CategoryService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category by ID', async () => {
      const mockCategory = { _id: '1', name: 'Deleted Category' };
      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(mockCategory);

      const result = await CategoryService.deleteCategory('1');

      expect(Category.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found', async () => {
      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await CategoryService.deleteCategory('nonexistent');

      expect(result).toBeNull();
    });
  });
});

describe('TagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    it('should create a tag with lowercase slug', async () => {
      const mockTag = {
        _id: 'tag-id-1',
        name: 'JavaScript',
        slug: 'javascript',
        isActive: true,
      };

      (Tag.create as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.createTag({
        name: 'JavaScript',
        slug: 'JAVASCRIPT',
      });

      expect(Tag.create).toHaveBeenCalledWith({
        name: 'JavaScript',
        slug: 'javascript',
      });
      expect(result.slug).toBe('javascript');
    });
  });

  describe('updateTag', () => {
    it('should update a tag with lowercase slug', async () => {
      const mockUpdatedTag = {
        _id: 'tag-id-1',
        name: 'TypeScript',
        slug: 'typescript',
        isActive: true,
      };

      (Tag.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedTag);

      const result = await TagService.updateTag('tag-id-1', {
        name: 'TypeScript',
        slug: 'TYPESCRIPT',
      });

      expect(Tag.findByIdAndUpdate).toHaveBeenCalledWith(
        'tag-id-1',
        { name: 'TypeScript', slug: 'typescript' },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedTag);
    });

    it('should return null if tag not found', async () => {
      (Tag.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await TagService.updateTag('nonexistent', {
        name: 'Not Found',
      });

      expect(result).toBeNull();
    });
  });

  describe('getAllTags', () => {
    it('should return all tags sorted by createdAt descending', async () => {
      const mockTags = [
        { _id: '1', name: 'Tag 1' },
        { _id: '2', name: 'Tag 2' },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockTags);
      (Tag.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await TagService.getAllTags();

      expect(Tag.find).toHaveBeenCalledWith();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockTags);
    });
  });

  describe('getActiveTags', () => {
    it('should return only active tags', async () => {
      const mockTags = [{ _id: '1', name: 'Active Tag', isActive: true }];

      const mockSort = jest.fn().mockResolvedValue(mockTags);
      (Tag.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const result = await TagService.getActiveTags();

      expect(Tag.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockTags);
    });
  });

  describe('getTagById', () => {
    it('should return a tag by ID', async () => {
      const mockTag = { _id: 'tag-id-1', name: 'JavaScript' };
      (Tag.findById as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.getTagById('tag-id-1');

      expect(Tag.findById).toHaveBeenCalledWith('tag-id-1');
      expect(result).toEqual(mockTag);
    });

    it('should return null if tag not found', async () => {
      (Tag.findById as jest.Mock).mockResolvedValue(null);

      const result = await TagService.getTagById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTagBySlug', () => {
    it('should find tag by lowercase slug', async () => {
      const mockTag = { _id: '1', slug: 'javascript' };
      (Tag.findOne as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.getTagBySlug('JAVASCRIPT');

      expect(Tag.findOne).toHaveBeenCalledWith({ slug: 'javascript' });
      expect(result).toEqual(mockTag);
    });

    it('should return null if tag not found by slug', async () => {
      (Tag.findOne as jest.Mock).mockResolvedValue(null);

      const result = await TagService.getTagBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('toggleActiveStatus', () => {
    it('should toggle isActive from true to false', async () => {
      const mockTag = {
        _id: '1',
        isActive: true,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: false }),
      };
      (Tag.findById as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.toggleActiveStatus('1');

      expect(mockTag.isActive).toBe(false);
      expect(mockTag.save).toHaveBeenCalled();
    });

    it('should toggle isActive from false to true', async () => {
      const mockTag = {
        _id: '1',
        isActive: false,
        save: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      };
      (Tag.findById as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.toggleActiveStatus('1');

      expect(mockTag.isActive).toBe(true);
      expect(mockTag.save).toHaveBeenCalled();
    });

    it('should return null if tag not found', async () => {
      (Tag.findById as jest.Mock).mockResolvedValue(null);

      const result = await TagService.toggleActiveStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag by ID', async () => {
      const mockTag = { _id: '1', name: 'Deleted Tag' };
      (Tag.findByIdAndDelete as jest.Mock).mockResolvedValue(mockTag);

      const result = await TagService.deleteTag('1');

      expect(Tag.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTag);
    });

    it('should return null if tag not found', async () => {
      (Tag.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await TagService.deleteTag('nonexistent');

      expect(result).toBeNull();
    });
  });
});