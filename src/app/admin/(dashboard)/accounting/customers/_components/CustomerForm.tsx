'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface CustomerFormProps {
  initialData?: {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxId: string | null;
    status: string;
  };
}

export default function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [taxId, setTaxId] = useState(initialData?.taxId ?? '');
  const [isActive, setIsActive] = useState(initialData ? initialData.status === 'ACTIVE' : true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      taxId: taxId.trim() || null,
    };
    if (isEditing) {
      payload.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }

    try {
      const url = isEditing ? `/api/accounting/customers/${initialData.id}` : '/api/accounting/customers';
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save customer');
        return;
      }
      router.push('/admin/accounting/customers');
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
          {isEditing ? `Edit Customer ${initialData.code}` : 'Create New Customer'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Tax ID / VAT" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>

          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />

          {isEditing && <Toggle label="Active" checked={isActive} onChange={setIsActive} />}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/accounting/customers')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
