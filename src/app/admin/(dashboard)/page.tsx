import Link from 'next/link';
import PageService from '@/services/page-service';
import BlogService from '@/services/blog-service';
import UserService from '@/services/user-service';
import ContactService from '@/services/contact-service';
import MediaService from '@/services/media-service';
import CarouselService from '@/services/carousel-service';
import { requireAdmin } from '@/utils/auth';
import AnalyticsDashboard from '@/components/features/admin/AnalyticsDashboard';
import {
  LayoutDashboard,
  FileText,
  PenLine,
  Users,
  Mail,
  Image,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Settings,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  pages: number;
  blogs: number;
  users: number;
  submissions: number;
  unreadSubmissions: number;
  media: number;
  carousels: number;
}

interface RecentItem {
  id: string;
  title: string;
  type: 'page' | 'blog' | 'submission';
  createdAt: Date | string;
  status: 'active' | 'inactive' | 'unread' | 'read';
  href: string;
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [pages, blogs, users, submissions, media, carousels] = await Promise.all([
      PageService.getAllPages(),
      BlogService.getAllBlogs(),
      UserService.getAllUsers(),
      ContactService.getAllSubmissions(),
      MediaService.getAllMedia(),
      CarouselService.getAllCarouselItems(),
    ]);

    return {
      pages: pages.length,
      blogs: blogs.length,
      users: users.length,
      submissions: submissions.length,
      unreadSubmissions: submissions.filter((s: { isRead: boolean }) => !s.isRead).length,
      media: media.length,
      carousels: carousels.length,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return { pages: 0, blogs: 0, users: 0, submissions: 0, unreadSubmissions: 0, media: 0, carousels: 0 };
  }
}

async function getRecentActivity(): Promise<RecentItem[]> {
  try {
    const [pages, blogs, submissions] = await Promise.all([
      PageService.getAllPages(),
      BlogService.getAllBlogs(),
      ContactService.getAllSubmissions(),
    ]);

    const recentPages = pages.slice(0, 3).map((p: { _id: { toString: () => string }; title: string; createdAt: Date; isActive: boolean }) => ({
      id: p._id.toString(),
      title: p.title,
      type: 'page' as const,
      createdAt: p.createdAt,
      status: p.isActive ? 'active' as const : 'inactive' as const,
      href: `/admin/pages/${p._id.toString()}/edit`,
    }));

    const recentBlogs = blogs.slice(0, 3).map((b: { _id: { toString: () => string }; title: string; createdAt: Date; isActive: boolean }) => ({
      id: b._id.toString(),
      title: b.title,
      type: 'blog' as const,
      createdAt: b.createdAt,
      status: b.isActive ? 'active' as const : 'inactive' as const,
      href: `/admin/blogs/${b._id.toString()}/edit`,
    }));

    const recentSubmissions = submissions.slice(0, 3).map((s: { _id: { toString: () => string }; name: string; createdAt: Date; isRead: boolean }) => ({
      id: s._id.toString(),
      title: `Message from ${s.name}`,
      type: 'submission' as const,
      createdAt: s.createdAt,
      status: s.isRead ? 'read' as const : 'unread' as const,
      href: '/admin/contact-submissions',
    }));

    // Combine and sort by date, take top 5
    const allItems = [...recentPages, ...recentBlogs, ...recentSubmissions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return allItems;
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    return [];
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const statCards = [
  {
    key: 'pages' as const,
    label: 'Total Pages',
    href: '/admin/pages',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    key: 'blogs' as const,
    label: 'Blog Posts',
    href: '/admin/blogs',
    icon: PenLine,
    color: 'from-emerald-500 to-emerald-600',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    key: 'media' as const,
    label: 'Media Files',
    href: '/admin/media',
    icon: Image,
    color: 'from-violet-500 to-violet-600',
    lightColor: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    key: 'submissions' as const,
    label: 'Messages',
    href: '/admin/contact-submissions',
    icon: Mail,
    color: 'from-amber-500 to-amber-600',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
];

const quickActions = [
  { label: 'New Page', href: '/admin/pages/new', icon: Plus },
  { label: 'New Blog', href: '/admin/blogs/new', icon: PenLine },
  { label: 'Upload Media', href: '/admin/media/new', icon: Image },
  { label: 'Settings', href: '/admin/navigation', icon: Settings },
];

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();
  const recentActivity = await getRecentActivity();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome back! Here's what's happening with your CMS.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} className="group">
              <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />
                
                <div className="relative flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stats[card.key]}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* View all link */}
                <div className="relative mt-4 pt-4 border-t border-gray-100">
                  <span className={`text-sm font-medium ${card.textColor} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Last 7 days</span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Type Icon */}
                    <div className={`p-2 rounded-lg ${
                      item.type === 'page' ? 'bg-blue-100 text-blue-600' :
                      item.type === 'blog' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {item.type === 'page' && <FileText className="w-4 h-4" />}
                      {item.type === 'blog' && <PenLine className="w-4 h-4" />}
                      {item.type === 'submission' && <Mail className="w-4 h-4" />}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {item.status === 'unread' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Unread
                        </span>
                      )}
                      {item.status === 'active' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                      {item.status === 'inactive' && (
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          Inactive
                        </span>
                      )}
                      {item.status === 'read' && (
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          Read
                        </span>
                      )}
                    </div>
                    
                    {/* Time */}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                      <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Unread Messages Alert */}
          {stats.unreadSubmissions > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900">Unread Messages</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      You have <span className="font-bold">{stats.unreadSubmissions}</span> unread{' '}
                      {stats.unreadSubmissions === 1 ? 'message' : 'messages'} waiting for your attention.
                    </p>
                    <Link
                      href="/admin/contact-submissions"
                      className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      View Inbox
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-sm font-semibold text-gray-900">{stats.users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Carousel Items</span>
                <span className="text-sm font-semibold text-gray-900">{stats.carousels}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Pages</span>
                <span className="text-sm font-semibold text-gray-900">{stats.pages}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Blog Posts</span>
                <span className="text-sm font-semibold text-gray-900">{stats.blogs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Analytics Overview</h2>
        </div>
        <div className="p-6">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}