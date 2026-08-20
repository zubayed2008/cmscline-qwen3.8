import { MongoDBSearchProvider } from './mongodb-search-provider';

/**
 * Search Provider Module
 *
 * This abstraction layer allows the CMS to use different search services
 * (MongoDB Text Index, Elasticsearch, Meilisearch, etc.) by implementing
 * the ISearchProvider interface.
 *
 * To switch providers, update the SEARCH_PROVIDER environment variable
 * and create a new implementation of the interface.
 *
 * Types are imported from search-types.ts to avoid circular dependencies.
 */

// Re-export all types for backward compatibility
export type {
  SearchResult,
  SearchQuery,
  SearchResponse,
  ISearchProvider,
  SearchProviderType,
  SearchContentType,
} from './search-types';

import type { ISearchProvider, SearchProviderType } from './search-types';

/**
 * Get the configured search provider instance
 * This factory function returns the appropriate provider based on environment configuration.
 */
export function getSearchProvider(): ISearchProvider {
  const providerType = (process.env.SEARCH_PROVIDER || 'mongodb') as SearchProviderType;

  switch (providerType) {
    case 'mongodb': {
      return new MongoDBSearchProvider();
    }
    case 'elasticsearch': {
      // Future: Implement Elasticsearch provider
      throw new Error('Elasticsearch provider not yet implemented');
    }
    case 'meilisearch': {
      // Future: Implement Meilisearch provider
      throw new Error('Meilisearch provider not yet implemented');
    }
    default:
      throw new Error(`Unknown search provider: ${providerType}`);
  }
}