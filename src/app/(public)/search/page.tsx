import { Metadata } from 'next';
import { SearchService } from '@/services/search-service';
import type { SearchResponse } from '@/services/search/search-types';
import SearchBar from '@/components/features/public/SearchBar';
import SearchResults from '@/components/features/public/SearchResults';

export const dynamic = 'force-dynamic';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q || '';

  return {
    title: query ? `Search: ${query}` : 'Search',
    description: `Search results for "${query}" on ${siteName}`,
  };
}

/**
 * Search Page - Displays search results for pages and blogs.
 * Reads the q query parameter and calls the search service.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, type } = await searchParams;
  const query = q || '';

  let results: SearchResponse = { results: [], total: 0, query: '' };

  if (query.trim()) {
    const searchType = type === 'page' || type === 'blog' ? type : 'all';
    results = await SearchService.search(query.trim(), searchType, 20, 0);
  }

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Search</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Search our pages and blog posts
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto">
            <SearchBar placeholder="Search pages and blogs..." />
          </div>
        </header>

        {/* Search Results */}
        {query.trim() ? (
          <SearchResults
            results={results.results}
            query={query}
            total={results.total}
          />
        ) : (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Start searching</h2>
            <p className="text-gray-600">
              Enter a search term above to find pages and blog posts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}