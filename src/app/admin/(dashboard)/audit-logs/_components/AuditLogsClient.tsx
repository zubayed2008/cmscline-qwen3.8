'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuditAction } from '@/models/audit-log-model';

interface AuditLogUser {
  _id: string;
  name: string;
  email: string;
}

interface AuditLogData {
  _id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: AuditLogUser | null;
}

interface AuditStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntityType: Record<string, number>;
  mostActiveUsers: Array<{ userId: string; count: number }>;
}

interface AuditLogsResponse {
  logs: AuditLogData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogsClientProps {
  initialLogs: AuditLogData[];
  initialStats: AuditStats;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
};

export default function AuditLogsClient({ initialLogs, initialStats }: AuditLogsClientProps) {
  const [logs, setLogs] = useState<AuditLogData[]>(initialLogs);
  const [stats] = useState<AuditStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');

      if (selectedAction) {
        params.set('action', selectedAction);
      }
      if (selectedEntityType) {
        params.set('entityType', selectedEntityType);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const result = data.data as AuditLogsResponse;
        setLogs(
          result.logs.map((log) => ({
            ...log,
            user: log.userId
              ? {
                  _id:
                    (log.userId as unknown as { _id: string })._id?.toString() ||
                    log.userId.toString(),
                  name: (log.userId as unknown as { name: string }).name || 'Unknown',
                  email: (log.userId as unknown as { email: string }).email || 'Unknown',
                }
              : null,
          }))
        );
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedAction, selectedEntityType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEntityTypes = () => {
    const types = new Set<string>();
    Object.keys(stats.logsByEntityType).forEach((type) => types.add(type));
    return Array.from(types);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {getEntityTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action]}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.user ? (
                        <div>
                          <div className="font-medium">{log.user.name}</div>
                          <div className="text-gray-500 text-xs">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {log.changes && Object.keys(log.changes).length > 0 ? 'View' : '-'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded log details */}
        {expandedLog && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {(() => {
              const log = logs.find((l) => l._id === expandedLog);
              if (!log?.changes) return null;
              return (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Changes</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                  {log.userAgent && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">User Agent</h4>
                      <p className="text-xs text-gray-600 break-all">{log.userAgent}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}