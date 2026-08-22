import dbConnect from '@/utils/db-connect';
import ContentVersion, {
  IContentVersion,
  VersionContentType,
} from '@/models/content-version-model';
import Page, { IPage } from '@/models/page-model';
import Blog, { IBlog } from '@/models/blog-model';
import { getAuditContext } from '@/utils/audit-context';

export interface CreateVersionInput {
  contentType: VersionContentType;
  contentId: string;
  title: string;
  slug: string;
  content: string;
  changedBy?: string;
  changeSummary?: string;
}

export interface VersionFieldDiff {
  field: 'title' | 'slug' | 'content';
  oldValue: string;
  newValue: string;
  changed: boolean;
}

export interface VersionComparison {
  versionA: IContentVersion;
  versionB: IContentVersion;
  differences: VersionFieldDiff[];
}

/** Maximum number of versions retained per content item (oldest pruned first). */
export const MAX_VERSIONS_PER_CONTENT = 50;

/**
 * Resolves the acting user for a version entry.
 * Priority: explicit changedBy -> audit request context -> null.
 */
function resolveChangedBy(explicit?: string): string | undefined {
  if (explicit) return explicit;
  const context = getAuditContext();
  return context?.userId && context.userId !== 'system' ? context.userId : undefined;
}

/**
 * VersionService handles revision history for Pages and Blogs.
 * Every create/update can snapshot content into the ContentVersion collection,
 * enabling diffing and restoring of previous versions (Phase 11.1).
 */
export const VersionService = {
  /**
   * Creates a new version snapshot. The version number is auto-incremented
   * per (contentType, contentId) pair. Prunes versions beyond MAX_VERSIONS_PER_CONTENT.
   */
  async createVersion(input: CreateVersionInput): Promise<IContentVersion> {
    await dbConnect();

    const changedBy = resolveChangedBy(input.changedBy);
    if (!changedBy) {
      throw new Error('changedBy is required: no user could be resolved for this version');
    }

    const latest = await ContentVersion.findOne({
      contentType: input.contentType,
      contentId: input.contentId,
    }).sort({ version: -1 });

    const nextVersion = latest ? latest.version + 1 : 1;

    const version = await ContentVersion.create({
      contentType: input.contentType,
      contentId: input.contentId,
      version: nextVersion,
      title: input.title,
      slug: input.slug.toLowerCase(),
      content: input.content,
      changedBy,
      changeSummary: input.changeSummary,
    });

    // Prune oldest versions beyond the retention limit (best-effort)
    await VersionService.pruneVersions(
      input.contentType,
      input.contentId,
      MAX_VERSIONS_PER_CONTENT
    );

    return version;
  },

  /**
   * Lists all versions for a content item, newest first.
   * Populates changedBy with the user's name and email.
   */
  async getVersions(contentType: VersionContentType, contentId: string): Promise<IContentVersion[]> {
    await dbConnect();
    return ContentVersion.find({ contentType, contentId })
      .sort({ version: -1 })
      .populate('changedBy', 'name email');
  },

  /**
   * Gets the most recent version for a content item, or null if none exist.
   */
  async getLatestVersion(
    contentType: VersionContentType,
    contentId: string
  ): Promise<IContentVersion | null> {
    await dbConnect();
    return ContentVersion.findOne({ contentType, contentId }).sort({ version: -1 });
  },

  /**
   * Gets a single version by ID.
   */
  async getVersionById(id: string): Promise<IContentVersion | null> {
    await dbConnect();
    return ContentVersion.findById(id).populate('changedBy', 'name email');
  },

  /**
   * Compares two versions field-by-field (title, slug, content).
   * Both versions must belong to the same content item.
   */
  async compareVersions(versionAId: string, versionBId: string): Promise<VersionComparison> {
    await dbConnect();

    const versionA = await ContentVersion.findById(versionAId);
    const versionB = await ContentVersion.findById(versionBId);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }
    if (versionA.contentId.toString() !== versionB.contentId.toString()) {
      throw new Error('Cannot compare versions of different content items');
    }

    const fields: Array<VersionFieldDiff['field']> = ['title', 'slug', 'content'];
    const differences: VersionFieldDiff[] = fields.map((field) => ({
      field,
      oldValue: versionA[field],
      newValue: versionB[field],
      changed: versionA[field] !== versionB[field],
    }));

    return { versionA, versionB, differences };
  },

  /**
   * Restores a Page or Blog to the state captured in the given version.
   * Before overwriting, the CURRENT state is snapshotted as a new version
   * so a restore can itself be undone. Returns the restored document.
   */
  async restoreVersion(
    versionId: string,
    options?: { restoredBy?: string; changeSummary?: string }
  ): Promise<IPage | IBlog | null> {
    await dbConnect();

    const version = await ContentVersion.findById(versionId);
    if (!version) {
      return null;
    }

    const restoredBy = resolveChangedBy(options?.restoredBy);
    if (!restoredBy) {
      throw new Error('restoredBy is required: no user could be resolved for this restore');
    }

    const summary = options?.changeSummary ?? `Restored from version ${version.version}`;

    if (version.contentType === 'page') {
      const currentPage = await Page.findById(version.contentId);
      if (!currentPage) {
        throw new Error('The page for this version no longer exists');
      }

      // Snapshot the current state before overwriting
      await VersionService.createVersion({
        contentType: 'page',
        contentId: version.contentId.toString(),
        title: currentPage.title,
        slug: currentPage.slug,
        content: currentPage.content,
        changedBy: restoredBy,
        changeSummary: `Auto-snapshot before restoring version ${version.version}`,
      });

      const restoredPage = await Page.findByIdAndUpdate(
        version.contentId,
        {
          title: version.title,
          slug: version.slug.toLowerCase(),
          content: version.content,
        },
        { new: true, runValidators: true }
      );

      // Append restore info to the source version's summary trail
      await ContentVersion.findByIdAndUpdate(versionId, {
        changeSummary: `${version.changeSummary ? `${version.changeSummary} | ` : ''}${summary}`,
      });

      return restoredPage;
    }

    const currentBlog = await Blog.findById(version.contentId);
    if (!currentBlog) {
      throw new Error('The blog post for this version no longer exists');
    }

    // Snapshot the current state before overwriting
    await VersionService.createVersion({
      contentType: 'blog',
      contentId: version.contentId.toString(),
      title: currentBlog.title,
      slug: currentBlog.slug,
      content: currentBlog.content,
      changedBy: restoredBy,
      changeSummary: `Auto-snapshot before restoring version ${version.version}`,
    });

    const restoredBlog = await Blog.findByIdAndUpdate(
      version.contentId,
      {
        title: version.title,
        slug: version.slug.toLowerCase(),
        content: version.content,
      },
      { new: true, runValidators: true }
    );

    await ContentVersion.findByIdAndUpdate(versionId, {
      changeSummary: `${version.changeSummary ? `${version.changeSummary} | ` : ''}${summary}`,
    });

    return restoredBlog;
  },

  /**
   * Deletes a single version by ID.
   */
  async deleteVersion(id: string): Promise<IContentVersion | null> {
    await dbConnect();
    return ContentVersion.findByIdAndDelete(id);
  },

  /**
   * Deletes all versions belonging to a content item.
   * Called when the parent Page/Blog is deleted.
   */
  async deleteVersionsForContent(
    contentType: VersionContentType,
    contentId: string
  ): Promise<number> {
    await dbConnect();
    const result = await ContentVersion.deleteMany({ contentType, contentId });
    return (result as { deletedCount?: number } | null)?.deletedCount ?? 0;
  },

  /**
   * Removes the oldest versions when a content item exceeds the given limit.
   * Returns the number of pruned versions.
   */
  async pruneVersions(
    contentType: VersionContentType,
    contentId: string,
    keep: number = MAX_VERSIONS_PER_CONTENT
  ): Promise<number> {
    await dbConnect();

    const cutoff = await ContentVersion.findOne({ contentType, contentId })
      .sort({ version: -1 })
      .skip(keep);

    if (!cutoff) return 0;

    const result = await ContentVersion.deleteMany({
      contentType,
      contentId,
      version: { $lte: cutoff.version },
    });
    return (result as { deletedCount?: number } | null)?.deletedCount ?? 0;
  },
};

export default VersionService;