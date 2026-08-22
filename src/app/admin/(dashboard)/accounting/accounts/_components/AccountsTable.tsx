'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface AccountItem {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isActive: boolean;
  isPostable: boolean;
  parentId: string | null;
  createdByName: string | null;
}

export default function AccountsTable({ initialAccounts }: { initialAccounts: AccountItem[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountItem[]>(initialAccounts);
  const [error, setError] = useState('');

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setError('');
    try {
      const res = await fetch(`/api/accounting/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update account status');
        return;
      }
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)));
    } catch {
      setError('An error occurred while updating the account');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postable</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No accounts yet. Run the seed script or create one.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{account.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{account.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{account.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{account.normalBalance}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{account.isPostable ? 'Yes' : 'Group'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Toggle
                        checked={account.isActive}
                        onChange={(checked) => handleToggleActive(account.id, checked)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/accounting/accounts/${account.id}/edit`)}
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
