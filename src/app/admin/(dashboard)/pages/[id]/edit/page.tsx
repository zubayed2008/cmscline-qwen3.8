import { notFound } from 'next/navigation';
import PageService from '@/services/page-service';
import VersionService from '@/services/version-service';
import { requireAdmin } from '@/utils/auth';
import { toTranslationsRecord } from '@/utils/localized-content';
import PageForm from '../../_components/PageForm';
import VersionHistory, {
  SerializedVersion,
} from '@/components/features/admin/VersionHistory';

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

  // Phase 11.1: load version history server-side
  const versions = await VersionService.getVersions('page', id);
  const serializedVersions: SerializedVersion[] = versions.map((v) => ({
    _id: v._id.toString(),
    version: v.version,
    title: v.title,
    slug: v.slug,
    content: v.content,
    translations: toTranslationsRecord(v.translations) ?? {},
    changeSummary: v.changeSummary,
    changedByName:
      (v.changedBy as unknown as { name?: string; email?: string } | null)?.name ??
      (v.changedBy as unknown as { email?: string } | null)?.email ??
      'Unknown',
    createdAt: v.createdAt.toISOString(),
  }));

  const serializedPage = {
    _id: page._id.toString(),
    title: page.title,
    slug: page.slug,
    content: page.content,
    // Phase 15.5: pass per-locale translations to the form (Mongoose Map -> plain object)
    translations: toTranslationsRecord(page.translations) ?? {},
    isDefaultHomepage: page.isDefaultHomepage,
    isActive: page.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Page</h1>
      <PageForm initialData={serializedPage} />
      <VersionHistory
        contentType="page"
        contentId={serializedPage._id}
        current={{
          title: serializedPage.title,
          slug: serializedPage.slug,
          content: serializedPage.content,
          translations: serializedPage.translations,
        }}
        initialVersions={serializedVersions}
      />
    </div>
  );
}
