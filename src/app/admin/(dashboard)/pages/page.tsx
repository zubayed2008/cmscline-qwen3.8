import Link from 'next/link';
import PageService from '@/services/page-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import PagesTable from './_components/PagesTable';

export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  await requireAdmin();
  const pages = await PageService.getAllPages();

  // Convert MongoDB documents to plain objects for client component
  const serializedPages = pages.map((page) => ({
    _id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    isDefaultHomepage: page.isDefaultHomepage,
    isActive: page.isActive,
    createdAt: page.createdAt?.toISOString() ?? '',
    updatedAt: page.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <Link href="/admin/pages/new">
          <Button>Create Page</Button>
        </Link>
      </div>
      <PagesTable initialPages={serializedPages} />
    </div>
  );
}
