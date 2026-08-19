import { requireAdmin } from '@/utils/auth';
import NavigationMenuForm from '../_components/NavigationMenuForm';

export const metadata = {
  title: 'Create Navigation Menu - Admin',
};

export default async function NewNavigationMenuPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Navigation Menu
      </h1>
      <NavigationMenuForm />
    </div>
  );
}