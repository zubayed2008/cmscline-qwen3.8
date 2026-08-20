import { redirect } from 'next/navigation';
import { getSession } from '@/utils/auth';
import AdminSidebar from '@/components/features/admin/AdminSidebar';
import AdminHeader from '@/components/features/admin/AdminHeader';

export const metadata = {
  title: 'Admin Dashboard - CMS',
  description: 'CMS Administration Panel',
};

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Only Admin role can access the dashboard
  if (session.user.role !== 'Admin') {
    redirect('/admin/login');
  }

  // Extract only serializable properties to avoid circular reference issues
  // when passing from Server Component to Client Component
  const userProps = {
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
    role: session.user?.role ?? undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={userProps} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}