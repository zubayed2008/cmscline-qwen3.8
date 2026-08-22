/**
 * Status badge for the accounting module (journal / invoice / bill / period /
 * party / payment statuses). Pure presentational - importable from both
 * Server and Client components.
 */
const STATUS_COLORS: Record<string, string> = {
  // Journal lifecycle
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  POSTED: 'bg-green-100 text-green-800',
  REVERSED: 'bg-red-100 text-red-800',
  // Invoices
  ISSUED: 'bg-blue-100 text-blue-800',
  PARTIALLY_PAID: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
  VOIDED: 'bg-gray-200 text-gray-600',
  // Periods / parties
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-200 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-200 text-gray-600',
  // Payments
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function StatusBadge({
  status,
  className = '',
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
      } ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
