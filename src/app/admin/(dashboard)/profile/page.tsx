import { redirect } from 'next/navigation';
import { getSession } from '@/utils/auth';
import { UserService } from '@/services/user-service';
import ProfileForm from '@/components/features/admin/ProfileForm';

export const metadata = {
  title: 'Profile - Admin',
  description: 'Manage your profile settings',
};

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const user = await UserService.getUserById(session.user.id);

  if (!user) {
    redirect('/admin/login');
  }

  // Extract only serializable properties
  const userProps = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account information and security settings
        </p>
      </div>

      <ProfileForm initialData={userProps} />
    </div>
  );
}