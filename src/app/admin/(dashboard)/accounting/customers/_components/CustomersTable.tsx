'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface CustomerItem {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export default function CustomersTable({ initialCustomers }: { initialCustomers: CustomerItem[] }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [error, setError] = useState('');

  const handleToggleStatus = async (id: string, status: string) => {
    setError('');
    try {
      const res = await fetch(`/api/accounting/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update customer');
        return;
      }
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch {
      setError('An error occurred while updating the customer');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">All Customers</h2>
      </CardHeader>
      <CardBody className="p-0">
        {error && (
          <div className="px-6 pt-4">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No customers yet.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{customer.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.email ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.phone ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Toggle
                        checked={customer.status === 'ACTIVE'}
                        onChange={(checked) => handleToggleStatus(customer.id, checked ? 'ACTIVE' : 'INACTIVE')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/accounting/customers/${customer.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </td>
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
