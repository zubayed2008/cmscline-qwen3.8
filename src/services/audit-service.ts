import dbConnect from '@/utils/db-connect';
import AuditLog, { IAuditLog, AuditAction } from '@/models/audit-log-model';
import mongoose from 'mongoose';

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: IAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * AuditService handles all business logic for audit logging.
 * Tracks all content changes for compliance and debugging.
 */
export const AuditService = {
  /**
   * Creates a new audit log entry.
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<IAuditLog> {
    await dbConnect();

    const auditLog = await AuditLog.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ? new mongoose.Types.ObjectId(input.entityId) : undefined,
      userId: new mongoose.Types.ObjectId(input.userId),
      changes: input.changes,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return auditLog;
  },

  /**
   * Gets audit logs with filtering and pagination.
   */
  async getAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
    await dbConnect();

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (query.action) {
      filter.action = query.action;
    }

    if (query.entityType) {
      filter.entityType = query.entityType;
    }

    if (query.entityId) {
      filter.entityId = new mongoose.Types.ObjectId(query.entityId);
    }

    if (query.userId) {
      filter.userId = new mongoose.Types.ObjectId(query.userId);
    }

    if (query.startDate || query.endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.startDate) {
        createdAtFilter.$gte = query.startDate;
      }
      if (query.endDate) {
        createdAtFilter.$lte = query.endDate;
      }
      filter.createdAt = createdAtFilter;
    }

    // Execute query with pagination
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Gets audit logs for a specific entity.
   */
  async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<IAuditLog[]> {
    await dbConnect();

    return AuditLog.find({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  /**
   * Gets audit logs for a specific user.
   */
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<IAuditLog[]> {
    await dbConnect();

    return AuditLog.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  /**
   * Gets recent audit logs (for dashboard).
   */
  async getRecentAuditLogs(limit: number = 10): Promise<IAuditLog[]> {
    await dbConnect();

    return AuditLog.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  /**
   * Gets audit log statistics.
   */
  async getAuditStats(days: number = 30): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntityType: Record<string, number>;
    mostActiveUsers: Array<{ userId: string; count: number }>;
  }> {
    await dbConnect();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, actionStats, entityTypeStats, activeUsers] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Convert arrays to objects
    const logsByAction: Record<string, number> = {};
    actionStats.forEach((stat: { _id: string; count: number }) => {
      logsByAction[stat._id] = stat.count;
    });

    const logsByEntityType: Record<string, number> = {};
    entityTypeStats.forEach((stat: { _id: string; count: number }) => {
      logsByEntityType[stat._id] = stat.count;
    });

    const mostActiveUsers = activeUsers.map((user: { _id: mongoose.Types.ObjectId; count: number }) => ({
      userId: user._id.toString(),
      count: user.count,
    }));

    return {
      totalLogs,
      logsByAction,
      logsByEntityType,
      mostActiveUsers,
    };
  },

  /**
   * Deletes old audit logs (for maintenance).
   */
  async deleteOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    await dbConnect();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  },
};

export default AuditService;