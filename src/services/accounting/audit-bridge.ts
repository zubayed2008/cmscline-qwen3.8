/**
 * Audit bridge: accounting events -> existing MongoDB AuditService.
 *
 * Constraints honored:
 * - Fire-and-forget, NEVER inside the PostgreSQL transaction (spec §28):
 *   failures are logged, never propagated - auditing must not roll back
 *   financial writes.
 * - AuditService wraps ids in mongoose.Types.ObjectId, so PG UUIDs cannot go
 *   into `entityId`; they ride along inside `changes`.
 * - Events without a resolvable Mongo actor id (24-hex) are skipped silently.
 */
import { AuditService } from '@/services/audit-service';

const MONGO_ID_PATTERN = /^[0-9a-f]{24}$/i;

export interface AccountingAuditInput {
  action: 'create' | 'update' | 'delete';
  /** e.g. 'accounting_period', 'journal_entry', 'account'. */
  entityType: string;
  /** PostgreSQL UUID of the entity - recorded inside `changes`. */
  entityId?: string | null;
  /** Mongo user id of the acting user (from the NextAuth session). */
  userId?: string | null;
  /** Human-readable summary + structured details stored in `changes`. */
  summary: Record<string, unknown>;
}

export function auditAccountingEvent(input: AccountingAuditInput): void {
  const { action, entityType, entityId, userId, summary } = input;

  if (!userId || !MONGO_ID_PATTERN.test(userId)) {
    return; // No resolvable Mongo actor (system action) - nothing to attribute.
  }

  void AuditService.createAuditLog({
    action,
    entityType,
    userId,
    changes: { accountingEntityId: entityId ?? null, ...summary },
  }).catch((err: unknown) => {
    console.error(
      '[accounting-audit] Failed to record audit event:',
      err instanceof Error ? err.message : err
    );
  });
}
