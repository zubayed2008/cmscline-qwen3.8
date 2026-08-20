import Link from 'next/link';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import PageService from '@/services/page-service';
import BlogService from '@/services/blog-service';
import UserService from '@/services/user-service';
import ContactService from '@/services/contact-service';
import { requireAdmin } from '@/utils/auth';
import AnalyticsDashboard from '@/components/features/admin/AnalyticsDashboard';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  try {
    const [pages, blogs, users, submissions] = await Promise.all([
      PageService.getAllPages(),
      BlogService.getAllBlogs(),
      UserService.getAllUsers(),
      ContactService.getAllSubmissions(),
    ]);

    return {
      pages: pages.length,
      blogs: blogs.length,
      users: users.length,
      submissions: submissions.length,
      unreadSubmissions: submissions.filter((s: { isRead: boolean }) => !s.isRead).length,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return { pages: 0, blogs: 0, users: 0, submissions: 0, unreadSubmissions: 0 };
  }
}

const statCards = [
  {
    key: 'pages',
    label: 'Pages',
    href: '/admin/pages',
    icon: '📄',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'blogs',
    label: 'Blogs',
    href: '/admin/blogs',
    icon: '📝',
    color: 'bg-green-50 text-green-600',
  },
  {
    key: 'users',
    label: 'Users',
    href: '/admin/users',
    icon: '👥',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    key: 'submissions',
    label: 'Contact Messages',
    href: '/admin/contact-submissions',
    icon: '📬',
    color: 'bg-orange-50 text-orange-600',
  },
] as const;

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Link key={card.key} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody>
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats[card.key]}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {stats.unreadSubmissions > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Unread Messages</h2>
          </CardHeader>
          <CardBody>
            <p className="text-gray-600">
              You have {stats.unreadSubmissions} unread contact{' '}
              {stats.unreadSubmissions === 1 ? 'message' : 'messages'}.
            </p>
            <Link
              href="/admin/contact-submissions"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              View Inbox →
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Analytics Section */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        </CardHeader>
        <CardBody>
          <AnalyticsDashboard />
        </CardBody>
      </Card>
    </div>
  );
}
