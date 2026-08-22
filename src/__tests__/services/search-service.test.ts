import { SearchService } from '@/services/search-service';
import { getSearchProvider } from '@/services/search/search-provider';

// Mock the search provider factory
jest.mock('@/services/search/search-provider', () => ({
  getSearchProvider: jest.fn(),
}));

describe('SearchService', () => {
  const mockProvider = {
    search: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSearchProvider as jest.Mock).mockReturnValue(mockProvider);
  });

  describe('search', () => {
    it('should call the provider with query, type, limit, and offset', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        query: 'test',
      };
      mockProvider.search.mockResolvedValue(mockResponse);

      const result = await SearchService.search('test', 'all', 20, 0);

      expect(getSearchProvider).toHaveBeenCalled();
      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'all',
        limit: 20,
        offset: 0,
        locale: 'en',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use default values when not provided', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        query: 'test',
      };
      mockProvider.search.mockResolvedValue(mockResponse);

      await SearchService.search('test');

      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'all',
        limit: 20,
        offset: 0,
        locale: 'en',
      });
    });
  });

  describe('searchPages', () => {
    it('should search with type page', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        query: 'test',
      };
      mockProvider.search.mockResolvedValue(mockResponse);

      await SearchService.searchPages('test');

      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'page',
        limit: 20,
        offset: 0,
        locale: 'en',
      });
    });
  });

  describe('searchBlogs', () => {
    it('should search with type blog', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        query: 'test',
      };
      mockProvider.search.mockResolvedValue(mockResponse);

      await SearchService.searchBlogs('test');

      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'blog',
        limit: 20,
        offset: 0,
        locale: 'en',
      });
    });
  });

  describe('searchAll', () => {
    it('should search with type all', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        query: 'test',
      };
      mockProvider.search.mockResolvedValue(mockResponse);

      await SearchService.searchAll('test');

      expect(mockProvider.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'all',
        limit: 20,
        offset: 0,
        locale: 'en',
      });
    });
  });

  describe('isConfigured', () => {
    it('should return true when provider is configured', () => {
      const result = SearchService.isConfigured();
      expect(result).toBe(true);
    });

    it('should return false when provider is not configured', () => {
      mockProvider.isConfigured.mockReturnValue(false);
      const result = SearchService.isConfigured();
      expect(result).toBe(false);
    });
  });
});