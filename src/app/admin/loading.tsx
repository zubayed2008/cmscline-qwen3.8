/**
 * Admin Loading State
 * Displays a loading spinner for admin pages.
 */
export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}