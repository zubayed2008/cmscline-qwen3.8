import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout';

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'logout'],
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Indexes for efficient queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;