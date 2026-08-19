import { redirect } from 'next/navigation';
import { getSession } from '@/utils/auth';
import AdminSidebar from '@/components/features/admin/AdminSidebar';
import AdminHeader from '@/components/features/admin/AdminHeader';

export const metadata = {
  title: 'Admin Dashboard - CMS',
  description: 'CMS Administration Panel',
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader user={session.user} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}