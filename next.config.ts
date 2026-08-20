import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary domains
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Allow all cloudinary subdomains (different cloud names)
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Allow all HTTPS images (for external URLs)
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;