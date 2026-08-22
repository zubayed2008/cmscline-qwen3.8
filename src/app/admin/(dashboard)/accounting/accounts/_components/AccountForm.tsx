'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  isPostable: boolean;
}

interface AccountFormProps {
  accounts: AccountOption[];
  initialData?: {
    id: string;
    code: string;
    name: string;
    type: string;
    parentId: string | null;
    isPostable: boolean;
    isActive: boolean;
  };
}

const TYPE_OPTIONS = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((t) => ({
  value: t,
  label: t,
}));

export default function AccountForm({ accounts, initialData }: AccountFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [code, setCode] = useState(initialData?.code ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState(initialData?.type ?? 'Asset');
  const [parentId, setParentId] = useState(initialData?.parentId ?? '');
  const [isPostable, setIsPostable] = useState(initialData?.isPostable ?? true);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parentOptions = accounts
    .filter((account) => !account.isPostable)
    .map((account) => ({
      value: account.id,
      label: `${account.code} · ${account.name}`,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      parentId: parentId || null,
      isPostable,
    };
    if (!isEditing) {
      payload.code = code.trim().toUpperCase();
    } else {
      payload.isActive = isActive;
    }

    try {
      const url = isEditing ? `/api/accounting/accounts/${initialData.id}` : '/api/accounting/accounts';
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save account');
        return;
      }
      router.push('/admin/accounting/accounts');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Account' : 'Create New Account'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 6100"
              required={!isEditing}
              disabled={isEditing}
              className={isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rent Expense"
              required
            />
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <Select
              label="Parent (group account)"
              options={parentOptions}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="None — top level"
            />
          </div>

          <div className="flex gap-8">
            <Toggle label="Postable (not a group header)" checked={isPostable} onChange={setIsPostable} />
            {isEditing && <Toggle label="Active" checked={isActive} onChange={setIsActive} />}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/accounting/accounts')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
