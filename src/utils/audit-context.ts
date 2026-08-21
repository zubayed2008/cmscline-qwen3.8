import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export interface AuditContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
}

export const auditStore = new AsyncLocalStorage<AuditContext>();

// Use a globally unique symbol to avoid collisions.
// Symbol.for() guarantees the SAME symbol across all module instances.
const AUDIT_CONTEXT_KEY = Symbol.for('__audit_context__');

/**
 * Gets the current audit context.
 * Tries AsyncLocalStorage first, then falls back to globalThis.
 */
export function getAuditContext(): AuditContext | undefined {
  return auditStore.getStore() || (globalThis as any)[AUDIT_CONTEXT_KEY] || undefined;
}

/**
 * ONE-LINE wrapper for any route handler.
 */
export function withAudit<TContext>(
  handler: (request: NextRequest, context: TContext) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
    const session = await getServerSession(authOptions);
    const forwarded = request.headers.get('x-forwarded-for');

    const auditContext: AuditContext = {
      userId: session?.user?.id || 'system',
      ipAddress: forwarded ? forwarded.split(',')[0].trim() : 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Store on globalThis using a Symbol key.
    // This survives across different module instances and async boundaries.
    (globalThis as any)[AUDIT_CONTEXT_KEY] = auditContext;

    return auditStore.run(auditContext, () => handler(request, context));
  };
}