/**
 * SEO Utility Functions
 * Helpers for generating SEO-friendly content and metadata
 */

/**
 * Generates a plain text excerpt from HTML content
 * Removes HTML tags and truncates to specified length
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  if (!content) return '';
  
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  const decoded = plainText
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Trim whitespace
  const trimmed = decoded.trim();
  
  // Truncate to max length
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  // Find last space before max length to avoid cutting words
  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Generates a canonical URL from base URL and path
 */
export function generateCanonicalUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Generates OpenGraph image URL
 * Falls back to a default OG image if none provided
 */
export function generateOgImageUrl(
  imageUrl?: string | null,
  baseUrl?: string
): string | undefined {
  if (imageUrl) {
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Otherwise, prepend base URL
    if (baseUrl) {
      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${cleanBase}${cleanPath}`;
    }
  }
  return undefined;
}

/**
 * Formats a date for SEO purposes (ISO 8601)
 */
export function formatSeoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Generates a page title with site name suffix
 */
export function generatePageTitle(pageTitle: string, siteName: string): string {
  if (!pageTitle) return siteName;
  if (pageTitle === siteName) return pageTitle;
  return `${pageTitle} | ${siteName}`;
}

/**
 * Sanitizes a slug for URL usage
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates structured data for a blog post (JSON-LD)
 */
export function generateBlogStructuredData(options: {
  title: string;
  excerpt: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
  authorName?: string;
  imageUrl?: string;
  url: string;
  siteName: string;
}): Record<string, unknown> {
  const {
    title,
    excerpt,
    publishedAt,
    updatedAt,
    authorName,
    imageUrl,
    url,
    siteName,
  } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    datePublished: formatSeoDate(publishedAt),
    dateModified: updatedAt ? formatSeoDate(updatedAt) : formatSeoDate(publishedAt),
    url,
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    ...(authorName && {
      author: {
        '@type': 'Person',
        name: authorName,
      },
    }),
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
      },
    }),
  };
}

/**
 * Generates structured data for a web page (JSON-LD)
 */
export function generatePageStructuredData(options: {
  title: string;
  description: string;
  url: string;
  siteName: string;
}): Record<string, unknown> {
  const { title, description, url, siteName } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
  };
}