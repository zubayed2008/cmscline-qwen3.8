import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ==========================================
// 1. HELPER FUNCTIONS (IP & User-Agent)
// ==========================================
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  return 'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// ==========================================
// 2. AUDIT CONTEXT & STORE
// ==========================================
export interface AuditContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
}

export const auditStore = new AsyncLocalStorage<AuditContext>();
const AUDIT_CONTEXT_KEY = Symbol.for('__audit_context__');

export function getAuditContext(): AuditContext | undefined {
  return auditStore.getStore() || (globalThis as any)[AUDIT_CONTEXT_KEY] || undefined;
}

// ==========================================
// 3. ROUTE WRAPPER
// ==========================================
export function withAudit<TContext>(
  handler: (request: NextRequest, context: TContext) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
    const session = await getServerSession(authOptions);

    // Extract context using the helpers above
    const auditContext: AuditContext = {
      userId: session?.user?.id || 'system',
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    };

    // Store globally so the Mongoose plugin can access it safely
    (globalThis as any)[AUDIT_CONTEXT_KEY] = auditContext;

    // Run the route handler with thread-safe context
    return auditStore.run(auditContext, () => handler(request, context));
  };
}