import { notFound } from 'next/navigation';
import PageService from '@/services/page-service';
import { requireAdmin } from '@/utils/auth';
import PageForm from '../../_components/PageForm';

export const dynamic = 'force-dynamic';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage({ params }: EditPageProps) {
  await requireAdmin();
  const { id } = await params;
  const page = await PageService.getPageById(id);

  if (!page) {
    notFound();
  }

  const serializedPage = {
    _id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    content: page.content,
    isDefaultHomepage: page.isDefaultHomepage,
    isActive: page.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Page</h1>
      <PageForm initialData={serializedPage} />
    </div>
  );
}
