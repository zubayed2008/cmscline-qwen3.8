import { notFound } from 'next/navigation';
import { TagService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import TagForm from '../../_components/TagForm';

export const dynamic = 'force-dynamic';

interface EditTagProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage({ params }: EditTagProps) {
  await requireAdmin();
  const { id } = await params;
  const tag = await TagService.getTagById(id);

  if (!tag) {
    notFound();
  }

  const serializedTag = {
    _id: tag._id.toString(),
    name: tag.name,
    slug: tag.slug,
    isActive: tag.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Tag</h1>
      <TagForm initialData={serializedTag} />
    </div>
  );
}
