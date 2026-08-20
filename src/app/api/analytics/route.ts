import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import {
  getWebsites,
  getWebsiteStats,
  getActiveVisitors,
  getPageviews,
} from '@/services/umami-service';

// Default website ID from environment variable
const DEFAULT_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSession();
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    // Use provided websiteId, or fall back to environment variable
    const websiteId = searchParams.get('websiteId') || DEFAULT_WEBSITE_ID;

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    switch (type) {
      case 'websites': {
        // List all websites - no websiteId required
        const websites = await getWebsites();
        return NextResponse.json({ success: true, data: websites });
      }

      case 'stats': {
        if (!websiteId) {
          return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }
        const stats = await getWebsiteStats(websiteId, startDate, endDate);
        return NextResponse.json({ success: true, data: stats });
      }

      case 'active': {
        if (!websiteId) {
          return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }
        const active = await getActiveVisitors(websiteId);
        return NextResponse.json({ success: true, data: { active } });
      }

      case 'pageviews': {
        if (!websiteId) {
          return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }
        const pageviews = await getPageviews(websiteId, startDate, endDate);
        return NextResponse.json({ success: true, data: pageviews });
      }

      default: {
        if (!websiteId) {
          return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
        }
        // Return all stats combined
        const [stats, active, pageviews] = await Promise.all([
          getWebsiteStats(websiteId, startDate, endDate),
          getActiveVisitors(websiteId),
          getPageviews(websiteId, startDate, endDate),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            stats,
            active,
            pageviews,
            period: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
        });
      }
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
