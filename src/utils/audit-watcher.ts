import mongoose, { Model, Document } from 'mongoose';
import { AuditService } from '@/services/audit-service';
import { AuditAction } from '@/models/audit-log-model';

/**
 * Request context for audit logging.
 * This is stored per-request and accessed by Mongoose middleware.
 */
interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Module-level storage for current request context
// Uses AsyncLocalStorage for thread-safe context in async operations
let currentContext: AuditContext | null = null;

/**
 * Sets the current audit context for the current request.
 * Call this at the beginning of API routes to enable audit logging.
 */
export function setAuditContext(context: AuditContext | null): void {
  currentContext = context;
}

/**
 * Gets the current audit context.
 */
export function getAuditContext(): AuditContext | null {
  return currentContext;
}

/**
 * Model name to entity type mapping.
 */
const MODEL_TO_ENTITY_TYPE: Record<string, string> = {
  Page: 'Page',
  Blog: 'Blog',
  Category: 'Category',
  Tag: 'Tag',
  User: 'User',
  NavigationMenu: 'NavigationMenu',
  Media: 'Media',
  CarouselItem: 'CarouselItem',
  ServiceItem: 'ServiceItem',
  ContactSubmission: 'ContactSubmission',
};

/**
 * Sets up audit logging middleware for a Mongoose model.
 * This adds pre and post hooks to track create, update, and delete operations.
 */
export function setupAuditWatcher<T extends Document>(model: Model<T>): void {
  const entityType = MODEL_TO_ENTITY_TYPE[model.modelName] || model.modelName;
  const schema = model.schema as mongoose.Schema & {
    pre: (method: string, fn: (this: T, next: () => void) => void) => void;
    post: (method: string, fn: (this: T) => Promise<void>) => void;
  };

  // Pre-save hook (for tracking changes on update)
  schema.pre('save', function (this: T, next: () => void) {
    // Store the original document for comparison
    if (this.isNew) {
      // New document - will be logged in post-save
      (this as unknown as { _auditAction: AuditAction })._auditAction = 'create';
    } else {
      // Existing document - will be logged in post-save
      (this as unknown as { _auditAction: AuditAction })._auditAction = 'update';

      // Track changed paths for the audit log
      const modifiedPaths = this.modifiedPaths();
      const changes: Record<string, unknown> = {};

      for (const path of modifiedPaths) {
        changes[path] = {
          before: (this as unknown as { getChanges?: () => { $set?: Record<string, unknown> } }).getChanges?.().$set?.[path] ?? null,
          after: this.get(path),
        };
      }

      (this as unknown as { _auditChanges: Record<string, unknown> })._auditChanges = changes;
    }

    next();
  });

  // Post-save hook (for create and update)
  schema.post('save', async function (this: T) {
    const context = getAuditContext();
    const action = (this as unknown as { _auditAction: AuditAction })._auditAction || 'update';
    const changes = (this as unknown as { _auditChanges: Record<string, unknown> })._auditChanges;

    // Skip if no user context (system operations)
    if (!context?.userId) {
      return;
    }

    try {
      await AuditService.createAuditLog({
        action,
        entityType,
        entityId: this._id.toString(),
        userId: context.userId,
        changes: changes && Object.keys(changes).length > 0 ? changes : undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      console.error(`Failed to create audit log for ${entityType}:`, error);
    }
  });

  // Pre-delete hook (for tracking deletes)
  model.schema.pre('findOneAndDelete', async function (this: {
    getQuery: () => Record<string, unknown>;
    _auditDoc?: T;
  }) {
    try {
      // Fetch the document before deletion
      const query = this.getQuery();
      const doc = await model.findOne(query).lean();
      if (doc) {
        this._auditDoc = doc as T;
      }
    } catch (error) {
      console.error(`Failed to fetch document for audit log:`, error);
    }
  });

  // Post-delete hook
  model.schema.post('findOneAndDelete', async function (this: { _auditDoc?: T }) {
    const context = getAuditContext();

    if (!context?.userId || !this._auditDoc) {
      return;
    }

    try {
      await AuditService.createAuditLog({
        action: 'delete',
        entityType,
        entityId: (this._auditDoc as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
        userId: context.userId,
        changes: { deletedDocument: this._auditDoc },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      console.error(`Failed to create delete audit log for ${entityType}:`, error);
    }
  });

  // Handle deleteMany operations
  model.schema.pre('deleteMany', async function (this: {
    getQuery: () => Record<string, unknown>;
    _auditDocs?: T[];
  }) {
    try {
      const query = this.getQuery();
      const docs = await model.find(query).lean();
      if (docs.length > 0) {
        this._auditDocs = docs as T[];
      }
    } catch (error) {
      console.error(`Failed to fetch documents for audit log:`, error);
    }
  });

  model.schema.post('deleteMany', async function (this: { _auditDocs?: T[] }) {
    const context = getAuditContext();

    if (!context?.userId || !this._auditDocs || this._auditDocs.length === 0) {
      return;
    }

    try {
      // Create audit logs for each deleted document
      const auditPromises = this._auditDocs.map((doc) =>
        AuditService.createAuditLog({
          action: 'delete',
          entityType,
          entityId: (doc as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          userId: context.userId!,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })
      );

      await Promise.all(auditPromises);
    } catch (error) {
      console.error(`Failed to create delete audit logs for ${entityType}:`, error);
    }
  });
}

/**
 * Initializes audit watchers for all models.
 * Call this once during application startup.
 */
export function initializeAuditWatchers(): void {
  // Only initialize once
  if (typeof window !== 'undefined') return; // Skip on client side

  const models = mongoose.models;

  for (const [modelName, model] of Object.entries(models)) {
    if (MODEL_TO_ENTITY_TYPE[modelName]) {
      // Check if watchers are already set up
      const schemaOptions = model.schema.options as { auditWatcherSetup?: boolean };
      if (!schemaOptions.auditWatcherSetup) {
        setupAuditWatcher(model as Model<Document>);
        schemaOptions.auditWatcherSetup = true;
      }
    }
  }
}

export default {
  setAuditContext,
  getAuditContext,
  setupAuditWatcher,
  initializeAuditWatchers,
};