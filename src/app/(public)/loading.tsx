/**
 * Public Pages Loading State
 * Displays a loading spinner for public pages.
 */
export default function PublicLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}