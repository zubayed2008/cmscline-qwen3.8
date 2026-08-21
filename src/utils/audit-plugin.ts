import mongoose, { Schema, Model, Document, Query } from 'mongoose';
import { getAuditContext } from '@/utils/audit-context';
import { AuditService } from '@/services/audit-service';
import { AuditAction } from '@/models/audit-log-model';

const SKIP_FIELDS = new Set(['__v', 'updatedAt', 'createdAt', '_id']);
const LARGE_TEXT_FIELDS = new Set(['content', 'body', 'description', 'markdown']);

function buildChanges(
  oldDoc: Record<string, unknown> | null,
  newValues: Record<string, unknown>
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(newValues)) {
    if (SKIP_FIELDS.has(key)) continue;

    const displayValue =
      LARGE_TEXT_FIELDS.has(key) && typeof value === 'string' && value.length > 200
        ? '[CONTENT_UPDATED]'
        : value;

    changes[key] = {
      before: oldDoc ? oldDoc[key] ?? null : null,
      after: displayValue,
    };
  }

  return changes;
}

async function safeLog(params: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
}) {
  const ctx = getAuditContext();

  // ===== DEBUG =====
  console.log('🟢 [safeLog] Context received:', ctx);
  console.log('🟢 [safeLog] Params:', params.action, params.entityType, params.entityId);
  // ================

  if (!ctx?.userId) {
    console.log('🔴 [safeLog] SKIPPED: No userId');
    return;
  }

  try {
    await AuditService.createAuditLog({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: ctx.userId,
      changes: params.changes && Object.keys(params.changes).length > 0 ? params.changes : undefined,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    console.log('✅ [safeLog] Audit log saved successfully');
  } catch (err) {
    console.error('❌ [safeLog] FAILED:', err);
  }
}

/**
 * Mongoose plugin. Apply once globally — hooks every schema automatically.
 */
export function auditPlugin(schema: Schema): void {
  // Prevent duplicate registration during Next.js hot-reload
  if ((schema as any).__auditPluginApplied) return;
  (schema as any).__auditPluginApplied = true;

  const getEntityType = (modelName: string) => modelName || 'Unknown';

  // ─── SAVE (create + update via doc.save()) ───
  schema.pre('init', function (this: Document) {
    (this as any).__auditOriginal = this.toObject({ depopulate: true });
  });

  schema.pre('save', function (this: Document) {
    (this as any).__auditAction = this.isNew ? 'create' : 'update';

    if (!this.isNew) {
      const original = (this as any).__auditOriginal || {};
      const changes: Record<string, unknown> = {};

      for (const path of this.modifiedPaths()) {
        if (SKIP_FIELDS.has(path)) continue;

        const newVal = this.get(path);
        const displayValue =
          LARGE_TEXT_FIELDS.has(path) && typeof newVal === 'string' && newVal.length > 200
            ? '[CONTENT_UPDATED]'
            : newVal;

        changes[path] = {
          before: original[path] ?? null,
          after: displayValue,
        };
      }
      (this as any).__auditChanges = changes;
    }
  });

  schema.post('save', async function (this: Document) {
    await safeLog({
      action: (this as any).__auditAction || 'create',
      entityType: getEntityType((this.constructor as Model<Document>).modelName),
      entityId: this._id.toString(),
      changes: (this as any).__auditChanges,
    });
  });

  // ─── UPDATE (findOneAndUpdate, updateOne) ───
  // FIX: Explicitly type as mutable array instead of using `as const`
  const updateMethods: ('findOneAndUpdate' | 'updateOne')[] = ['findOneAndUpdate', 'updateOne'];

  schema.pre(updateMethods, { query: true, document: false }, async function (this: Query<any, any>) {
    try {
      const query = this.getQuery();
      const update = this.getUpdate() as Record<string, unknown> | null;
      if (!update) return;

      const oldDoc = await this.model.findOne(query).lean();
      const setValues =
        (update as any).$set || Object.fromEntries(
          Object.entries(update).filter(([k]) => !k.startsWith('$'))
        );

      (this as any).__auditChanges = buildChanges(
        oldDoc as Record<string, unknown> | null,
        setValues as Record<string, unknown>
      );
      (this as any).__auditEntityId = (oldDoc as any)?._id?.toString();
    } catch (err) {
      console.error('[Audit] Pre-update fetch failed:', err);
    }
  });

  schema.post(updateMethods, { query: true, document: false }, async function (this: Query<any, any>) {
    await safeLog({
      action: 'update',
      entityType: getEntityType(this.model.modelName),
      entityId: (this as any).__auditEntityId,
      changes: (this as any).__auditChanges,
    });
  });

  // ─── DELETE (findOneAndDelete, deleteOne) ───
  // FIX: Explicitly type as mutable array instead of using `as const`
  const deleteMethods: ('findOneAndDelete' | 'deleteOne')[] = ['findOneAndDelete', 'deleteOne'];

  schema.pre(deleteMethods, { query: true, document: false }, async function (this: Query<any, any>) {
    try {
      const doc = await this.model.findOne(this.getQuery()).lean();
      if (doc) {
        (this as any).__auditDoc = doc;
      }
    } catch (err) {
      console.error('[Audit] Pre-delete fetch failed:', err);
    }
  });

  schema.post(deleteMethods, { query: true, document: false }, async function (this: Query<any, any>) {
    const doc = (this as any).__auditDoc;
    if (!doc) return;

    await safeLog({
      action: 'delete',
      entityType: getEntityType(this.model.modelName),
      entityId: (doc as any)._id?.toString(),
      changes: {
        deleted: {
          title: (doc as any).title,
          slug: (doc as any).slug,
        },
      },
    });
  });
}