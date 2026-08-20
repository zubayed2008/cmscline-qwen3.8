/**
 * Search Provider Types
 *
 * Shared interfaces for search provider implementations.
 * These types are separated to avoid circular dependencies.
 * The search provider abstraction allows swapping between
 * MongoDB Text Index, Elasticsearch, Meilisearch, etc.
 */

export type SearchContentType = 'page' | 'blog';

export interface SearchResult {
  /** The unique identifier of the content */
  id: string;
  /** The content type (page or blog) */
  type: SearchContentType;
  /** The title of the content */
  title: string;
  /** The slug/URL path of the content */
  slug: string;
  /** A plain-text excerpt of the content */
  excerpt: string;
  /** The relevance score (higher is more relevant) */
  score: number;
  /** The date the content was created */
  createdAt: Date;
  /** The date the content was last updated */
  updatedAt: Date;
  /** Optional featured image URL (for blogs) */
  featuredImageUrl?: string | null;
  /** Optional category name (for blogs) */
  categoryName?: string | null;
}

export interface SearchQuery {
  /** The search query string */
  query: string;
  /** The content type to search (page, blog, or all) */
  type?: SearchContentType | 'all';
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
}

export interface SearchResponse {
  /** The search results */
  results: SearchResult[];
  /** Total number of matching results */
  total: number;
  /** The query that was executed */
  query: string;
}

/**
 * Search Provider Interface
 * All search implementations must implement this interface.
 */
export interface ISearchProvider {
  /**
   * Search for content matching the query
   * @param query - The search query parameters
   * @returns Promise resolving to the search response
   */
  search(query: SearchQuery): Promise<SearchResponse>;

  /**
   * Check if the search provider is properly configured
   * @returns true if the provider is ready to use
   */
  isConfigured(): boolean;
}

/**
 * Search provider type enum
 */
export type SearchProviderType = 'mongodb' | 'elasticsearch' | 'meilisearch';