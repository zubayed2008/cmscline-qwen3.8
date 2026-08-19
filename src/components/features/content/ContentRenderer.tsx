import { parse, HTMLElement, TextNode, NodeType } from 'node-html-parser';
import GenericCarousel, { CarouselItemData } from '@/components/ui/GenericCarousel';
import { CarouselService } from '@/services/carousel-service';
import { CarouselType } from '@/models/carousel-item-model';

interface ContentRendererProps {
  content: string;
}

interface CarouselData {
  type: string;
  title: string;
  items: CarouselItemData[];
}

async function fetchCarouselData(type: string, title: string): Promise<CarouselData | null> {
  try {
    const items = await CarouselService.getActiveCarouselItemsByType(type as CarouselType);
    if (items.length === 0) return null;
    return {
      type,
      title,
      items: items.map((item) => ({
        id: item._id.toString(),
        title: item.title || undefined,
        imageOrIconUrl: item.imageOrIconUrl,
      })),
    };
  } catch {
    return null;
  }
}

export default async function ContentRenderer({ content }: ContentRendererProps) {
  // Parse the HTML content
  const root = parse(content);

  // Find all carousel nodes and fetch their data
  const carouselNodes = root.querySelectorAll('[data-carousel]');
  const carouselDataMap = new Map<string, CarouselData>();

  for (const node of carouselNodes) {
    const type = node.getAttribute('data-carousel-type') || 'hero';
    const title = node.getAttribute('data-carousel-title') || '';
    const key = `${type}-${title}`;

    if (!carouselDataMap.has(key)) {
      const data = await fetchCarouselData(type, title);
      if (data) {
        carouselDataMap.set(key, data);
      }
    }
  }

  // Render the content with embedded components
  return (
    <div className="prose prose-lg max-w-none">
      <RenderContent html={content} carouselData={carouselDataMap} />
    </div>
  );
}

interface RenderContentProps {
  html: string;
  carouselData: Map<string, CarouselData>;
}

function RenderContent({ html, carouselData }: RenderContentProps) {
  const root = parse(html);

  const renderNode = (node: HTMLElement | TextNode, key: number): React.ReactNode => {
    // Handle text nodes
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = (node as TextNode).text;
      // Skip whitespace-only text nodes
      if (!text.trim()) return null;
      return text;
    }

    const element = node as HTMLElement;

    // Handle carousel nodes
    if (element.hasAttribute('data-carousel')) {
      const type = element.getAttribute('data-carousel-type') || 'hero';
      const title = element.getAttribute('data-carousel-title') || '';
      const data = carouselData.get(`${type}-${title}`);

      if (data) {
        const typeLabel =
          type === 'client' ? 'Companies We Work With' : title || `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        return (
          <div key={key} className="my-8 not-prose">
            <GenericCarousel
              title={typeLabel}
              type={type as CarouselType}
              items={data.items}
            />
          </div>
        );
      }
      return null;
    }

    // Handle media embed nodes
    if (element.hasAttribute('data-media-embed')) {
      const url = element.getAttribute('data-media-url') || '';
      const filename = element.getAttribute('data-media-filename') || '';
      const mimeType = element.getAttribute('data-media-mimetype') || '';

      if (url) {
        if (mimeType.startsWith('image/')) {
          return (
            <figure key={key} className="my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={filename} className="rounded-lg w-full" />
              {filename && (
                <figcaption className="text-center text-sm text-gray-500 mt-2">{filename}</figcaption>
              )}
            </figure>
          );
        }
        if (mimeType.startsWith('video/')) {
          return (
            <div key={key} className="my-6">
              <video controls className="rounded-lg w-full">
                <source src={url} type={mimeType} />
                Your browser does not support the video tag.
              </video>
            </div>
          );
        }
        // Other file types - render as download link
        return (
          <div key={key} className="my-4">
            <a
              href={url}
              download={filename}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-blue-600 hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {filename || 'Download File'}
            </a>
          </div>
        );
      }
      return null;
    }

    // Handle regular elements
    const tagName = element.tagName.toLowerCase();
    const children = element.childNodes.map((child, i) => renderNode(child as HTMLElement | TextNode, i));

    // Map HTML attributes to React props
    const props: Record<string, unknown> = { key };
    if (element.getAttribute('class')) props.className = element.getAttribute('class');
    if (element.getAttribute('href')) props.href = element.getAttribute('href');
    if (element.getAttribute('src')) props.src = element.getAttribute('src');
    if (element.getAttribute('alt')) props.alt = element.getAttribute('alt');

    switch (tagName) {
      case 'p':
        return <p {...props}>{children}</p>;
      case 'h1':
        return <h1 {...props}>{children}</h1>;
      case 'h2':
        return <h2 {...props}>{children}</h2>;
      case 'h3':
        return <h3 {...props}>{children}</h3>;
      case 'h4':
        return <h4 {...props}>{children}</h4>;
      case 'ul':
        return <ul {...props}>{children}</ul>;
      case 'ol':
        return <ol {...props}>{children}</ol>;
      case 'li':
        return <li {...props}>{children}</li>;
      case 'blockquote':
        return <blockquote {...props}>{children}</blockquote>;
      case 'a':
        return <a {...props}>{children}</a>;
      case 'strong':
        return <strong {...props}>{children}</strong>;
      case 'em':
        return <em {...props}>{children}</em>;
      case 's':
        return <s {...props}>{children}</s>;
      case 'br':
        return <br key={key} />;
      case 'hr':
        return <hr key={key} />;
      case 'img':
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...props} />;
      case 'pre':
        return <pre {...props}>{children}</pre>;
      case 'code':
        return <code {...props}>{children}</code>;
      case 'div':
        return <div {...props}>{children}</div>;
      case 'span':
        return <span {...props}>{children}</span>;
      default:
        return <>{children}</>;
    }
  };

  return <>{root.childNodes.map((node, i) => renderNode(node as HTMLElement | TextNode, i))}</>;
}