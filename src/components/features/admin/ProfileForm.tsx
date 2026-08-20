'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface ProfileFormProps {
  initialData: {
    _id: string;
    name: string;
    email: string;
    role: string;
    profileImage?: string;
    emailVerified: boolean;
    lastLoginAt?: string;
  };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData.name);
  const [email, setEmail] = useState(initialData.email);
  const [profileImage, setProfileImage] = useState(initialData.profileImage || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match if changing
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    // Require current password if changing email or password
    if ((email !== initialData.email || newPassword) && !currentPassword) {
      setError('Current password is required to change email or password.');
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        profileImage: profileImage || undefined,
      };

      if (currentPassword) {
        body.currentPassword = currentPassword;
      }

      if (newPassword) {
        body.newPassword = newPassword;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setSuccess('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account information and security
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Account Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Information</h3>
            <div className="space-y-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Profile Image URL"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Email Status:</span>
                {initialData.emailVerified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                    Not Verified
                  </span>
                )}
              </div>

              {initialData.lastLoginAt && (
                <p className="text-sm text-gray-500">
                  Last login: {new Date(initialData.lastLoginAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Leave blank to keep your current password
            </p>
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={8}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}