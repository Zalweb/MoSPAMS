import { useState, useEffect } from 'react';
import { Store, Palette, Globe, Upload, Copy, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiMutation } from '@/shared/lib/api';

interface ShopBranding {
  shopName: string;
  shopDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  invitationCode: string;
  customDomain: string | null;
  domainStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'ACTIVE';
}

type TabType = 'profile' | 'branding' | 'domain';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<ShopBranding | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadBranding();
  }, []);

  async function loadBranding() {
    try {
      setLoading(true);
      const response = await apiGet<{ data: ShopBranding }>('/api/shop/branding');
      setBranding(response.data);
    } catch (error) {
      console.error('Failed to load branding:', error);
      toast.error('Failed to load shop settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!branding) return;
    try {
      setSaving(true);
      await apiMutation('/api/shop/branding', 'PATCH', {
        shopName: branding.shopName,
        shopDescription: branding.shopDescription,
        contactEmail: branding.contactEmail,
        contactPhone: branding.contactPhone,
        address: branding.address,
      });
      toast.success('Shop profile updated successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save shop profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBranding() {
    if (!branding) return;
    try {
      setSaving(true);
      await apiMutation('/api/shop/branding', 'PATCH', {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      });
      toast.success('Branding updated successfully');
      // Apply colors to document root
      document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(branding.primaryColor));
      document.documentElement.style.setProperty('--color-secondary-rgb', hexToRgb(branding.secondaryColor));
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await apiMutation('/api/shop/logo', 'POST', formData);
      toast.success('Logo uploaded successfully');
      loadBranding();
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  }

  async function handleDeleteLogo() {
    try {
      await apiMutation('/api/shop/logo', 'DELETE');
      toast.success('Logo deleted successfully');
      loadBranding();
    } catch (error) {
      console.error('Failed to delete logo:', error);
      toast.error('Failed to delete logo');
    }
  }

  async function handleRegenerateCode() {
    try {
      await apiMutation('/api/shop/invitation-code/regenerate', 'POST');
      toast.success('Invitation code regenerated');
      loadBranding();
    } catch (error) {
      console.error('Failed to regenerate code:', error);
      toast.error('Failed to regenerate invitation code');
    }
  }

  function handleCopyCode() {
    if (branding?.invitationCode) {
      navigator.clipboard.writeText(branding.invitationCode);
      setCopied(true);
      toast.success('Invitation code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-sm text-zinc-400">Failed to load shop settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-sm text-zinc-400">Manage your shop profile, branding, and access settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'text-white border-white'
              : 'text-zinc-500 border-transparent hover:text-zinc-300'
          }`}
        >
          <Store className="w-4 h-4" strokeWidth={2} />
          Shop Profile
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'branding'
              ? 'text-white border-white'
              : 'text-zinc-500 border-transparent hover:text-zinc-300'
          }`}
        >
          <Palette className="w-4 h-4" strokeWidth={2} />
          Branding
        </button>
        <button
          onClick={() => setActiveTab('domain')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'domain'
              ? 'text-white border-white'
              : 'text-zinc-500 border-transparent hover:text-zinc-300'
          }`}
        >
          <Globe className="w-4 h-4" strokeWidth={2} />
          Domain & Access
        </button>
      </div>

      {/* Content */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Shop Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Shop Name</label>
                  <input
                    type="text"
                    value={branding.shopName}
                    onChange={(e) => setBranding({ ...branding, shopName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Enter shop name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                  <textarea
                    value={branding.shopDescription || ''}
                    onChange={(e) => setBranding({ ...branding, shopDescription: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Brief description of your shop"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={branding.contactEmail || ''}
                      disabled
                      className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-500 text-sm cursor-not-allowed"
                      placeholder="shop@example.com"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Email is linked to your Google account</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={branding.contactPhone || ''}
                      onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={branding.address || ''}
                    onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Shop address"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Brand Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Primary Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-16 h-12 rounded-xl cursor-pointer bg-zinc-800 border border-zinc-700"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Secondary Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-16 h-12 rounded-xl cursor-pointer bg-zinc-800 border border-zinc-700"
                    />
                    <input
                      type="text"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Shop Logo</h3>
              <div className="flex items-start gap-6">
                {branding.logoUrl ? (
                  <div className="relative">
                    <img
                      src={branding.logoUrl}
                      alt="Shop logo"
                      className="w-24 h-24 rounded-xl object-cover border border-zinc-700"
                    />
                    <button
                      onClick={handleDeleteLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Store className="w-8 h-8 text-zinc-600" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm font-medium hover:bg-zinc-700 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" strokeWidth={2} />
                      Upload Logo
                    </span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">Recommended: 512x512px, PNG or JPG</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'domain' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Invitation Code</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Share this code with staff and mechanics to join your shop
              </p>
              <div className="flex gap-3">
                <div className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-mono text-lg">
                  {branding.invitationCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white hover:bg-zinc-700 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white hover:bg-zinc-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Custom Domain</h3>
              {branding.customDomain ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white">
                      {branding.customDomain}
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        branding.domainStatus === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : branding.domainStatus === 'VERIFIED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : branding.domainStatus === 'PENDING'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}
                    >
                      {branding.domainStatus}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {branding.domainStatus === 'PENDING' && 'Waiting for DNS verification'}
                    {branding.domainStatus === 'VERIFIED' && 'Domain verified, ready to activate'}
                    {branding.domainStatus === 'ACTIVE' && 'Domain is active and serving traffic'}
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
                  <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 mb-4">No custom domain configured</p>
                  <p className="text-xs text-zinc-500">Contact support to set up a custom domain for your shop</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
