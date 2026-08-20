import Link from 'next/link';
import type { SearchResult } from '@/services/search/search-types';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  total: number;
}

/**
 * SearchResults - Server component that displays search results.
 * Renders pages and blogs with type badges, titles, excerpts, and links.
 */
export default function SearchResults({ results, query, total }: SearchResultsProps) {
  if (results.length === 0) {
    return (
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
        <p className="text-gray-600">
          We couldn't find anything matching "{query}". Try different keywords.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-6">
        Found {total} result{total !== 1 ? 's' : ''} for "{query}"
      </p>

      <div className="space-y-4">
        {results.map((result) => {
          const href = result.type === 'blog' ? `/blog/${result.slug}` : `/${result.slug}`;

          return (
            <article
              key={`${result.type}-${result.id}`}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      result.type === 'blog'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {result.type === 'blog' ? 'Blog Post' : 'Page'}
                  </span>
                  {result.categoryName && (
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                      {result.categoryName}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  <Link href={href} className="hover:text-blue-600 transition-colors">
                    {result.title}
                  </Link>
                </h2>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{result.excerpt}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <time dateTime={result.updatedAt.toISOString()}>
                    {result.updatedAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <Link
                    href={href}
                    className="text-blue-600 font-medium hover:text-blue-700"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}