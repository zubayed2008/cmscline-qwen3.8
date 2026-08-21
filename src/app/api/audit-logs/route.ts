import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { AuditService } from '@/services/audit-service';
import { AuditAction } from '@/models/audit-log-model';

/**
 * GET /api/audit-logs
 * Returns paginated audit logs with optional filtering.
 * Admin only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action') as AuditAction | null;
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // Validate action if provided
    const validActions: AuditAction[] = ['create', 'update', 'delete', 'login', 'logout'];
    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // Build query
    const query = {
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      userId: userId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    // Get audit logs
    const result = await AuditService.getAuditLogs(query);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audit-logs
 * Deletes old audit logs (maintenance endpoint).
 * Admin only endpoint.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysToKeep = searchParams.get('daysToKeep');

    const days = daysToKeep ? parseInt(daysToKeep, 10) : 90;

    // Validate days
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: 'daysToKeep must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Delete old audit logs
    const deletedCount = await AuditService.deleteOldAuditLogs(days);

    return NextResponse.json({
      success: true,
      data: { deletedCount, daysToKeep: days },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.error('Error deleting old audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete old audit logs' },
      { status: 500 }
    );
  }
}