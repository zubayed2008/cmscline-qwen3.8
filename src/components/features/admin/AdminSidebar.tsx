'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Categorized navigation items
const navCategories = [
  {
    title: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: '📊' }],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/pages', label: 'Pages', icon: '📄' },
      { href: '/admin/blogs', label: 'Blogs', icon: '📝' },
      { href: '/admin/categories', label: 'Categories', icon: '📁' },
      { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
    ],
  },
  {
    title: 'Media & Design',
    items: [
      { href: '/admin/media', label: 'Media', icon: '🖼️' },
      { href: '/admin/carousels', label: 'Carousels', icon: '🎠' },
    ],
  },
  {
    title: 'Site Settings',
    items: [
      { href: '/admin/navigation', label: 'Navigation', icon: '🧭' },
      { href: '/admin/service-items', label: 'Services', icon: '⚙️' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/contact-submissions', label: 'Inbox', icon: '📬' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-64px)] hidden lg:block">
      <nav className="p-4">
        {navCategories.map((category) => (
          <div key={category.title} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
              {category.title}
            </h3>
            <ul className="space-y-1">
              {category.items.map((item) => {
                const isActive =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
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
