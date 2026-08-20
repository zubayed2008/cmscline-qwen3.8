/**
 * StructuredData Component
 * Renders JSON-LD structured data in a script tag for SEO
 */

interface StructuredDataProps {
  data: Record<string, unknown>;
}

/**
 * Component that renders JSON-LD structured data
 * Used for rich search results (blog posts, pages, etc.)
 */
export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}