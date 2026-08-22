'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import { Plus, Trash2 } from 'lucide-react';

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface JournalLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

function toMoney(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '0.00';
  return MONEY_PATTERN.test(trimmed) ? trimmed : trimmed;
}

function emptyLine(): JournalLine {
  return { accountId: '', debit: '', credit: '', description: '' };
}

export default function JournalEntryForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  }));

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  // Live Dr = Cr indicator (client-side display only; server recomputes totals).
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;
  const validAmount = (value: string) => value === '' || MONEY_PATTERN.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lines.length < 2) {
      setError('A journal entry requires at least two lines');
      return;
    }
    for (const [index, line] of lines.entries()) {
      if (!line.accountId) {
        setError(`Line ${index + 1}: choose an account`);
        return;
      }
      if (!validAmount(line.debit) || !validAmount(line.credit)) {
        setError(`Line ${index + 1}: amounts must be decimal strings with at most 2 fraction digits`);
        return;
      }
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit <= 0 && credit <= 0) {
        setError(`Line ${index + 1}: an amount must be greater than zero`);
        return;
      }
      if (debit > 0 && credit > 0) {
        setError(`Line ${index + 1}: an amount may appear on only one side`);
        return;
      }
    }
    if (!balanced) {
      setError('The entry is not balanced - total debits must equal total credits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate,
          memo: memo.trim() || undefined,
          reference: reference.trim() || undefined,
          lines: lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit || '0.00',
            credit: line.credit || '0.00',
            description: line.description.trim() || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create journal entry');
        return;
      }
      router.push('/admin/accounting/journal-entries');
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
        <h2 className="text-lg font-semibold text-gray-900">New Journal Entry</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Entry Date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            <Input label="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Short description" />
            <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional ref" />
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
                  <div className="col-span-12 md:col-span-4">
                    <Select
                      label="Account"
                      options={accountOptions}
                      value={line.accountId}
                      onChange={(e) => updateLine(index, { accountId: e.target.value })}
                      placeholder="Select account"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Input
                      label="Debit"
                      value={line.debit}
                      onChange={(e) => updateLine(index, { debit: toMoney(e.target.value) })}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Input
                      label="Credit"
                      value={line.credit}
                      onChange={(e) => updateLine(index, { credit: toMoney(e.target.value) })}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="col-span-10 md:col-span-3">
                    <Input
                      label="Description"
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`mt-4 flex items-center justify-between px-4 py-3 rounded-lg border ${
                balanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <span className={`text-sm font-medium ${balanced ? 'text-green-800' : 'text-red-800'}`}>
                {balanced ? 'Balanced — debits equal credits' : 'Unbalanced — debits must equal credits'}
              </span>
              <span className="text-sm tabular-nums">
                Dr {totalDebit.toFixed(2)} = Cr {totalCredit.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !balanced}>
              {loading ? 'Creating...' : 'Create Draft'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/accounting/journal-entries')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
