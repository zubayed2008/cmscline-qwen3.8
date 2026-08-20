'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PenLine,
  Folder,
  Tag,
  Image,
  Film,
  Navigation,
  Wrench,
  Users,
  Mail,
} from 'lucide-react';

// Categorized navigation items with lucide icons
const navCategories = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/pages', label: 'Pages', icon: FileText },
      { href: '/admin/blogs', label: 'Blogs', icon: PenLine },
      { href: '/admin/categories', label: 'Categories', icon: Folder },
      { href: '/admin/tags', label: 'Tags', icon: Tag },
    ],
  },
  {
    title: 'Media & Design',
    items: [
      { href: '/admin/media', label: 'Media', icon: Image },
      { href: '/admin/carousels', label: 'Carousels', icon: Film },
    ],
  },
  {
    title: 'Site Settings',
    items: [
      { href: '/admin/navigation', label: 'Navigation', icon: Navigation },
      { href: '/admin/service-items', label: 'Services', icon: Wrench },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/contact-submissions', label: 'Inbox', icon: Mail },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] hidden lg:block">
      <nav className="p-4 space-y-6">
        {navCategories.map((category) => (
          <div key={category.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
              {category.title}
            </h3>
            <ul className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      style={isActive ? { borderLeftWidth: '3px', borderLeftColor: '#1d4ed8' } : {}}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}