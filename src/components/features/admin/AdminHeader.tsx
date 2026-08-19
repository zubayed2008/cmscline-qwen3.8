'use client';

import { signOut } from 'next-auth/react';
import Button from '@/components/ui/Button';

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">CMS Admin</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
          <p className="text-xs text-gray-500">{user.role}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
}
