import Link from 'next/link';
import { TagService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import TagsTable from './_components/TagsTable';

export const dynamic = 'force-dynamic';

export default async function AdminTagsPage() {
  await requireAdmin();
  const tags = await TagService.getAllTags();

  // Convert MongoDB documents to plain objects for client component
  const serializedTags = tags.map((tag) => ({
    _id: tag._id.toString(),
    name: tag.name,
    slug: tag.slug,
    isActive: tag.isActive,
    createdAt: tag.createdAt?.toISOString() ?? '',
    updatedAt: tag.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
        <Link href="/admin/tags/new">
          <Button>Create Tag</Button>
        </Link>
      </div>
      <TagsTable initialTags={serializedTags} />
    </div>
  );
}
