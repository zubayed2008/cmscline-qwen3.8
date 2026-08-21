import { NextRequest } from 'next/server';
import { getSession } from '@/utils/auth';
import { AuditService, CreateAuditLogInput } from '@/services/audit-service';
import { AuditAction } from '@/models/audit-log-model';

/**
 * Extracts client IP address from request.
 * Handles proxy headers (X-Forwarded-For) for deployments behind load balancers.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Extracts user agent from request.
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Creates an audit log entry with request context.
 * Automatically extracts IP address, user agent, and user ID from session.
 */
export async function createAuditLogFromRequest(
  request: NextRequest,
  action: AuditAction,
  entityType: string,
  additionalData?: Partial<CreateAuditLogInput>
): Promise<void> {
  try {
    const session = await getSession();

    // If no session, we can't create an audit log (for login attempts, we handle separately)
    if (!session?.user?.id && action !== 'login') {
      return;
    }

    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const auditInput: CreateAuditLogInput = {
      action,
      entityType,
      userId: session?.user?.id || 'system',
      ipAddress,
      userAgent,
      ...additionalData,
    };

    // Create audit log asynchronously (don't await to avoid blocking response)
    AuditService.createAuditLog(auditInput).catch((error) => {
      console.error('Failed to create audit log:', error);
    });
  } catch (error) {
    console.error('Error in createAuditLogFromRequest:', error);
  }
}

/**
 * Creates an audit log entry for login attempts (special case - no session required).
 */
export async function createLoginAuditLog(
  request: NextRequest,
  userId: string,
  success: boolean
): Promise<void> {
  try {
    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const auditInput: CreateAuditLogInput = {
      action: 'login',
      entityType: 'User',
      userId,
      ipAddress,
      userAgent,
      changes: { success },
    };

    // Create audit log asynchronously
    AuditService.createAuditLog(auditInput).catch((error) => {
      console.error('Failed to create login audit log:', error);
    });
  } catch (error) {
    console.error('Error in createLoginAuditLog:', error);
  }
}

/**
 * Creates an audit log entry for logout.
 */
export async function createLogoutAuditLog(
  request: NextRequest,
  userId: string
): Promise<void> {
  try {
    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const auditInput: CreateAuditLogInput = {
      action: 'logout',
      entityType: 'User',
      userId,
      ipAddress,
      userAgent,
    };

    // Create audit log asynchronously
    AuditService.createAuditLog(auditInput).catch((error) => {
      console.error('Failed to create logout audit log:', error);
    });
  } catch (error) {
    console.error('Error in createLogoutAuditLog:', error);
  }
}

/**
 * Helper to extract changes from before/after objects.
 * Returns an object containing only the changed fields.
 */
export function extractChanges<T extends Record<string, unknown>>(
  before: T | null,
  after: T | null
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  if (!before || !after) {
    return changes;
  }

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Compare values (handle objects/arrays by stringifying)
    const beforeStr = typeof beforeValue === 'object' ? JSON.stringify(beforeValue) : beforeValue;
    const afterStr = typeof afterValue === 'object' ? JSON.stringify(afterValue) : afterValue;

    if (beforeStr !== afterStr) {
      changes[key] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}

export default {
  getClientIp,
  getUserAgent,
  createAuditLogFromRequest,
  createLoginAuditLog,
  createLogoutAuditLog,
  extractChanges,
};