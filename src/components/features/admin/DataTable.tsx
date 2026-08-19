'use client';

import { ReactNode } from 'react';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T extends { _id: string; isActive?: boolean }> {
  title: string;
  columns: Column<T>[];
  data: T[];
  onToggleActive?: (id: string, isActive: boolean) => Promise<void>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  actions?: ReactNode;
  emptyMessage?: string;
}

export default function DataTable<T extends { _id: string; isActive?: boolean }>({
  title,
  columns,
  data,
  onToggleActive,
  onEdit,
  onDelete,
  actions,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
                {onToggleActive && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onToggleActive ? 1 : 0) + (onEdit || onDelete ? 1 : 0)}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[column.key] ?? '')}
                      </td>
                    ))}
                    {onToggleActive && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Toggle
                          checked={item.isActive ?? false}
                          onChange={(checked) => onToggleActive(item._id, checked)}
                        />
                      </td>
                    )}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {onEdit && (
                            <Button variant="ghost" size="sm" onClick={() => onEdit(item._id)}>
                              Edit
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  onDelete(item._id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}