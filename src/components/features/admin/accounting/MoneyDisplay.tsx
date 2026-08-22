/**
 * Money display for the accounting module.
 *
 * Monetary values are fixed 2-decimal STRINGS end-to-end (NUMERIC(18,2) rows
 * come back as strings). This component renders them verbatim - it never
 * parses to a float for display. Pure presentational, safe in Server and
 * Client components.
 */
export default function MoneyDisplay({
  value,
  currency,
  className = '',
}: {
  value: string | number;
  currency?: string;
  className?: string;
}) {
  const text = typeof value === 'number' ? value.toFixed(2) : value;
  return (
    <span className={`tabular-nums font-medium ${className}`}>
      {text}
      {currency ? <span className="ml-1 text-xs text-gray-400">{currency}</span> : null}
    </span>
  );
}
