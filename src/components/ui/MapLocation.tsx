'use client';

interface MapLocationProps {
  address: string;
  title?: string;
}

/**
 * MapLocation - Renders an embedded Google Maps iframe based on the provided address.
 * Uses Google Maps embed with the address as the query parameter.
 */
export default function MapLocation({ address, title = 'Our Location' }: MapLocationProps) {
  if (!address) {
    return null;
  }

  // Encode the address for use in the Google Maps embed URL
  const encodedAddress = encodeURIComponent(address);
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  return (
    <section className="py-12 bg-gray-50" aria-label={title}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">{title}</h2>
        <div className="rounded-xl overflow-hidden shadow-lg">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map showing ${address}`}
            className="w-full"
          />
        </div>
        <p className="mt-4 text-center text-gray-600">
          <svg
            className="inline-block w-5 h-5 mr-2 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {address}
        </p>
      </div>
    </section>
  );
}
