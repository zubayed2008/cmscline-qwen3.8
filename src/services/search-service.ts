import { getSearchProvider } from './search/search-provider';
import type { SearchResponse, SearchContentType } from './search/search-types';

/**
 * SearchService handles all search operations.
 * Uses the configurable search provider (MongoDB Text Index by default).
 * To switch providers, update the SEARCH_PROVIDER environment variable.
 */
export const SearchService = {
  /**
   * Search for content matching the query
   * @param query - The search query string
   * @param type - The content type to search (page, blog, or all)
   * @param limit - Maximum number of results to return
   * @param offset - Number of results to skip (for pagination)
   * @param locale - Locale used for localized result titles/excerpts (Phase 15.5)
   */
  async search(
    query: string,
    type: SearchContentType | 'all' = 'all',
    limit: number = 20,
    offset: number = 0,
    locale: string = 'en'
  ): Promise<SearchResponse> {
    const provider = getSearchProvider();
    return provider.search({ query, type, limit, offset, locale });
  },

  /**
   * Search only pages
   */
  async searchPages(query: string, limit: number = 20, offset: number = 0): Promise<SearchResponse> {
    return this.search(query, 'page', limit, offset);
  },

  /**
   * Search only blogs
   */
  async searchBlogs(query: string, limit: number = 20, offset: number = 0): Promise<SearchResponse> {
    return this.search(query, 'blog', limit, offset);
  },

  /**
   * Search all content types (pages and blogs)
   */
  async searchAll(
    query: string,
    limit: number = 20,
    offset: number = 0,
    locale: string = 'en'
  ): Promise<SearchResponse> {
    return this.search(query, 'all', limit, offset, locale);
  },

  /**
   * Check if the search provider is configured
   */
  isConfigured(): boolean {
    const provider = getSearchProvider();
    return provider.isConfigured();
  },
};

export default SearchService;