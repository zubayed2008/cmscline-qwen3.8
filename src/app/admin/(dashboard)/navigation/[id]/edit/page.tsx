import { notFound } from 'next/navigation';
import NavigationService from '@/services/navigation-service';
import NavigationMenuForm from '../../_components/NavigationMenuForm';

export const dynamic = 'force-dynamic';

interface EditNavigationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNavigationMenuPage({
  params,
}: EditNavigationPageProps) {
  const { id } = await params;
  const menu = await NavigationService.getNavigationMenuById(id);

  if (!menu) {
    notFound();
  }

  const serializedMenu = {
    _id: menu._id.toString(),
    title: menu.title,
    isDefault: menu.isDefault,
    isActive: menu.isActive,
    links: (menu.links ?? []).map((link) => ({
      label: link.label ?? '',
      url: link.url ?? '',
    })),
    siteInfo: {
      address: menu.siteInfo?.address ?? '',
      phone: menu.siteInfo?.phone ?? '',
      email: menu.siteInfo?.email ?? '',
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Navigation Menu
      </h1>
      <NavigationMenuForm initialData={serializedMenu} />
    </div>
  );
}