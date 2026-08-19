import Link from 'next/link';
import BlogService from '@/services/blog-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import BlogsTable from './_components/BlogsTable';

export const dynamic = 'force-dynamic';

export default async function AdminBlogsPage() {
  await requireAdmin();
  const blogs = await BlogService.getAllBlogs();

  const serializedBlogs = blogs.map((blog) => ({
    _id: blog._id.toString(),
    title: blog.title,
    slug: blog.slug,
    isActive: blog.isActive,
    createdAt: blog.createdAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blogs</h1>
        <Link href="/admin/blogs/new">
          <Button>Create Blog</Button>
        </Link>
      </div>
      <BlogsTable initialBlogs={serializedBlogs} />
    </div>
  );
}