'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface NavLinkItem {
  label: string;
  url: string;
}

interface SiteInfoData {
  address: string;
  phone: string;
  email: string;
}

interface NavigationMenuFormProps {
  initialData?: {
    _id: string;
    title: string;
    isDefault: boolean;
    isActive: boolean;
    links: NavLinkItem[];
    siteInfo: SiteInfoData;
  };
}

export default function NavigationMenuForm({ initialData }: NavigationMenuFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [links, setLinks] = useState<NavLinkItem[]>(
    initialData?.links ?? [{ label: '', url: '' }]
  );
  const [siteInfo, setSiteInfo] = useState<SiteInfoData>(
    initialData?.siteInfo ?? { address: '', phone: '', email: '' }
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkChange = (
    index: number,
    field: keyof NavLinkItem,
    value: string
  ) => {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  const addLink = () => {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSiteInfoChange = (field: keyof SiteInfoData, value: string) => {
    setSiteInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing
        ? `/api/navigation-menus/${initialData._id}`
        : '/api/navigation-menus';
      const method = isEditing ? 'PUT' : 'POST';

      // Filter out empty links
      const validLinks = links.filter((link) => link.label.trim() && link.url.trim());

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          isDefault,
          isActive,
          links: validLinks,
          siteInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save navigation menu');
        return;
      }

      router.push('/admin/navigation');
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
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Navigation Menu' : 'Create Navigation Menu'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Menu Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Main Navigation"
            required
          />

          <div className="flex items-center gap-8">
            <Toggle
              label="Default Menu"
              checked={isDefault}
              onChange={setIsDefault}
            />
            <Toggle label="Active" checked={isActive} onChange={setIsActive} />
          </div>

          {/* Links Builder */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Navigation Links
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={addLink}>
                + Add Link
              </Button>
            </div>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      value={link.label}
                      onChange={(e) =>
                        handleLinkChange(index, 'label', e.target.value)
                      }
                      placeholder="Link Label"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={link.url}
                      onChange={(e) =>
                        handleLinkChange(index, 'url', e.target.value)
                      }
                      placeholder="/url or https://..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeLink(index)}
                    disabled={links.length <= 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Site Info */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Site Information
            </h3>
            <div className="space-y-4">
              <Input
                label="Address"
                value={siteInfo.address}
                onChange={(e) => handleSiteInfoChange('address', e.target.value)}
                placeholder="123 Main St, City, Country"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={siteInfo.phone}
                  onChange={(e) => handleSiteInfoChange('phone', e.target.value)}
                  placeholder="+1 234 567 890"
                />
                <Input
                  label="Email"
                  type="email"
                  value={siteInfo.email}
                  onChange={(e) => handleSiteInfoChange('email', e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Menu' : 'Create Menu'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/navigation')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}