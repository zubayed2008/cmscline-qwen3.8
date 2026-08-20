'use client';

import Script from 'next/script';

/**
 * UmamiAnalytics Component
 *
 * Integrates self-hosted Umami analytics into the application.
 * Uses next/script for async loading to prevent hydration errors.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_UMAMI_WEBSITE_ID: The website ID from Umami dashboard
 * - NEXT_PUBLIC_UMAMI_SCRIPT_URL: The URL where Umami script is hosted
 */
export default function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

  // Only render if both environment variables are configured
  if (!websiteId || !scriptUrl) {
    return null;
  }

  return (
    <Script
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="afterInteractive"
      defer
    />
  );
}