import { requireAdmin } from '@/utils/auth';
import { AuditService } from '@/services/audit-service';
import AuditLogsClient from './_components/AuditLogsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage() {
  await requireAdmin();

  // Fetch initial audit logs and stats
  const [initialLogs, stats] = await Promise.all([
    AuditService.getAuditLogs({ page: 1, limit: 20 }),
    AuditService.getAuditStats(30),
  ]);

  // Serialize logs for client component
  const serializedLogs = initialLogs.logs.map((log) => ({
    _id: log._id.toString(),
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId?.toString(),
    userId: log.userId.toString(),
    changes: log.changes,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt?.toISOString() ?? '',
    user: log.userId
      ? {
          _id: (log.userId as unknown as { _id: string })._id?.toString() || log.userId.toString(),
          name: (log.userId as unknown as { name: string }).name || 'Unknown',
          email: (log.userId as unknown as { email: string }).email || 'Unknown',
        }
      : null,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Logs (30 days)</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Create Actions</p>
          <p className="text-2xl font-bold text-green-600">{stats.logsByAction['create'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Update Actions</p>
          <p className="text-2xl font-bold text-blue-600">{stats.logsByAction['update'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Delete Actions</p>
          <p className="text-2xl font-bold text-red-600">{stats.logsByAction['delete'] || 0}</p>
        </div>
      </div>

      <AuditLogsClient initialLogs={serializedLogs} initialStats={stats} />
    </div>
  );
}