'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface OpenDoc {
  id: string;
  number: string;
  balanceDue: string;
}

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentType: 'CUSTOMER' | 'VENDOR';
  partyId: string;
  partyName: string;
  accounts: AccountOption[];
  onSuccess?: () => void;
}

const OPEN_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
const OPEN_BILL_STATUSES = ['POSTED', 'PARTIALLY_PAID'];

function sumStrings(values: string[]): string {
  return values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0).toFixed(2);
}

export default function RecordPaymentModal({
  open,
  onClose,
  paymentType,
  partyId,
  partyName,
  accounts,
  onSuccess,
}: RecordPaymentModalProps) {
  const [docs, setDocs] = useState<OpenDoc[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashAccountId, setCashAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cashOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  }));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const endpoint =
      paymentType === 'CUSTOMER'
        ? `/api/accounting/customers/${partyId}?statement=true`
        : `/api/vendors/${partyId}?statement=true`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setError('');
        setReference('');
        if (!data.success) {
          setError(data.error || 'Failed to load open documents');
          setDocs([]);
          return;
        }
        const rawDocs: Array<{ id: string; number: string; status: string; balanceDue: string }> =
          paymentType === 'CUSTOMER'
            ? (data.data.invoices as Array<{
                id: string;
                invoiceNumber: string;
                status: string;
                balanceDue: string;
              }>).map((doc) => ({
                id: doc.id,
                number: doc.invoiceNumber,
                status: doc.status,
                balanceDue: doc.balanceDue,
              }))
            : (data.data.bills as Array<{
                id: string;
                billNumber: string;
                status: string;
                balanceDue: string;
              }>).map((doc) => ({
                id: doc.id,
                number: doc.billNumber,
                status: doc.status,
                balanceDue: doc.balanceDue,
              }));
        const statuses =
          paymentType === 'CUSTOMER' ? OPEN_INVOICE_STATUSES : OPEN_BILL_STATUSES;
        const openDocs = rawDocs
          .filter((doc) => statuses.includes(doc.status) && Number(doc.balanceDue) > 0)
          .map((doc) => ({
            id: doc.id,
            number: doc.number,
            balanceDue: doc.balanceDue,
          }));
        setDocs(openDocs);
        setAllocations(Object.fromEntries(openDocs.map((doc) => [doc.id, doc.balanceDue])));
        setAmount(sumStrings(openDocs.map((doc) => doc.balanceDue)));
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load open documents');
          setDocs([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, partyId, paymentType]);

  if (!open) return null;

  const allocationList = Object.entries(allocations)
    .map(([id, value]) => ({ id, amount: value || '0.00' }))
    .filter((allocation) => Number(allocation.amount) > 0);

  const allocationSum = sumStrings(allocationList.map((a) => a.amount));
  const allocationValid = Number(amount) > 0 && Number(allocationSum) <= Number(amount) + 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cashAccountId) {
      setError('Choose a cash/bank account');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }
    if (allocationList.length === 0) {
      setError('At least one document allocation is required');
      return;
    }
    if (Number(allocationSum) > Number(amount) + 0.001) {
      setError('The sum of allocations cannot exceed the payment amount');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        paymentDate,
        amount,
        cashAccountId,
        reference: reference.trim() || null,
        allocations: allocationList.map((allocation) =>
          paymentType === 'CUSTOMER'
            ? { invoiceId: allocation.id, amount: allocation.amount }
            : { billId: allocation.id, amount: allocation.amount }
        ),
      };
      if (paymentType === 'CUSTOMER') {
        payload.customerId = partyId;
      } else {
        payload.vendorId = partyId;
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to record payment');
        return;
      }
      onSuccess?.();
      onClose();
    } catch {
      setError('An error occurred while recording the payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Record {paymentType === 'CUSTOMER' ? 'Customer' : 'Vendor'} Payment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Applying payment to <span className="font-semibold">{partyName}</span> — {docs.length} open{' '}
            {paymentType === 'CUSTOMER' ? 'invoice(s)' : 'bill(s)'}.
          </p>
          {error && <ErrorBanner message={error} />}

          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No open documents for this party. Payment could not be allocated.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="grid grid-cols-12 gap-3 items-center border border-gray-200 rounded-lg p-3">
                  <span className="col-span-6 text-sm font-mono text-gray-900">{doc.number}</span>
                  <span className="col-span-3 text-right text-sm text-gray-500">
                    Balance: <MoneyDisplay value={doc.balanceDue} />
                  </span>
                  <div className="col-span-3">
                    <Input
                      value={allocations[doc.id] ?? ''}
                      onChange={(e) => setAllocations((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Payment Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
            <Input label="Payment Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            <Select label="Cash / Bank Account" options={cashOptions} value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)} placeholder="Select account" />
            <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Allocations: <MoneyDisplay value={allocationSum} /> of {amount || '0.00'}
            </span>
            {!allocationValid && (
              <span className="text-red-600 font-medium">Allocations must not exceed the amount</span>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !allocationValid || docs.length === 0}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
