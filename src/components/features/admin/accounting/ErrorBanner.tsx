/**
 * Red error banner used across the accounting admin screens (connection
 * failures, failed actions). Pure presentational.
 */
export default function ErrorBanner({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm ${className}`}
    >
      {message}
    </div>
  );
}
