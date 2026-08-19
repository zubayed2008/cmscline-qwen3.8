import Link from 'next/link';
import NavigationService from '@/services/navigation-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import NavigationTable from './_components/NavigationTable';

export const dynamic = 'force-dynamic';

export default async function AdminNavigationPage() {
  await requireAdmin();
  const menus = await NavigationService.getAllNavigationMenus();

  const serializedMenus = menus.map((menu) => ({
    _id: menu._id.toString(),
    title: menu.title,
    isDefault: menu.isDefault,
    isActive: menu.isActive,
    linksCount: menu.links?.length ?? 0,
    createdAt: menu.createdAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
        <Link href="/admin/navigation/new">
          <Button>Create Menu</Button>
        </Link>
      </div>
      <NavigationTable initialMenus={serializedMenus} />
    </div>
  );
}
