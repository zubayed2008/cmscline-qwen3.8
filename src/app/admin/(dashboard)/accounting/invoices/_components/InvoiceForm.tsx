'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import { Plus, Trash2 } from 'lucide-react';

interface Option {
  id: string;
  code: string;
  name: string;
}

interface InvoiceLine {
  accountId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

function emptyLine(): InvoiceLine {
  return { accountId: '', description: '', quantity: '1', unitPrice: '', taxRate: '0' };
}

function lineTotal(line: InvoiceLine): number {
  return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
}

export default function InvoiceForm({
  customers,
  accounts,
}: {
  customers: Option[];
  accounts: Option[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.code} · ${customer.name}`,
  }));
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  }));

  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const taxAmount = lines.reduce(
    (sum, line) => sum + lineTotal(line) * ((Number(line.taxRate) || 0) / 100),
    0
  );
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Choose a customer');
      return;
    }
    if (lines.length === 0 || lines.some((line) => !line.accountId)) {
      setError('Every line must have an account');
      return;
    }
    if (total <= 0) {
      setError('Invoice total must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          issueDate,
          dueDate,
          notes: notes.trim() || undefined,
          lines: lines.map((line) => ({
            accountId: line.accountId,
            description: line.description.trim() || undefined,
            quantity: Number(line.quantity),
            unitPrice: line.unitPrice,
            taxRate: Number(line.taxRate) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create invoice');
        return;
      }
      router.push('/admin/accounting/invoices');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Customer" options={customerOptions} value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Select customer" />
            <Input label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Lines</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Add Line
              </Button>
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                  <div className="col-span-12 md:col-span-3">
                    <Select
                      label="Revenue Account"
                      options={accountOptions}
                      value={line.accountId}
                      onChange={(e) => updateLine(index, { accountId: e.target.value })}
                      placeholder="Select account"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      label="Description"
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      placeholder="Item / service"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Input
                      label="Qty"
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      label="Unit Price"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      label="Tax %"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={line.taxRate}
                      onChange={(e) => updateLine(index, { taxRate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-1 flex justify-end gap-2 items-center">
                    <span className="text-sm tabular-nums text-gray-700">
                      <MoneyDisplay value={lineTotal(line).toFixed(2)} />
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-6 text-sm">
              <span className="text-gray-500">Subtotal: <MoneyDisplay value={subtotal.toFixed(2)} /></span>
              <span className="text-gray-500">Tax: <MoneyDisplay value={taxAmount.toFixed(2)} /></span>
              <span className="font-semibold text-gray-900">Total: <MoneyDisplay value={total.toFixed(2)} /></span>
            </div>
          </div>

          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes" />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || total <= 0}>
              {loading ? 'Creating...' : 'Create Draft'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/accounting/invoices')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
