import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Upload, X, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { useShop } from '@/shared/contexts/ShopContext';
import { toast } from 'sonner';

interface ShopBranding {
  shopId: string;
  shopName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  invitationCode: string;
}

export default function ShopBrandingSettings() {
  const { shop, refetch } = useShop();
  const [branding, setBranding] = useState<ShopBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    shopName: '',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{ data: ShopBranding }>('/api/shop/branding');
      setBranding(response.data);
      setFormData({
        shopName: response.data.shopName,
        primaryColor: response.data.primaryColor,
        secondaryColor: response.data.secondaryColor,
      });
    } catch (error) {
      console.error('Failed to fetch branding:', error);
      toast.error('Failed to load shop branding');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiMutation('/api/shop/branding', 'PATCH', formData);
      toast.success('Shop branding updated successfully');
      await refetch(); // Refresh global shop context
      await fetchBranding();
    } catch (error) {
      console.error('Failed to update branding:', error);
      toast.error('Failed to update shop branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/shop/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      toast.success('Logo uploaded successfully');
      await refetch();
      await fetchBranding();
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await apiMutation('/api/shop/logo', 'DELETE');
      toast.success('Logo deleted successfully');
      await refetch();
      await fetchBranding();
    } catch (error) {
      console.error('Failed to delete logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  const handleRegenerateCode = async () => {
    try {
      await apiMutation('/api/shop/invitation-code/regenerate', 'POST');
      toast.success('Invitation code regenerated');
      await fetchBranding();
    } catch (error) {
      console.error('Failed to regenerate code:', error);
      toast.error('Failed to regenerate invitation code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Shop Branding</h2>
        <p className="text-sm text-zinc-400">Customize your shop's appearance and branding</p>
      </motion.div>

      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Upload className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Shop Logo</h3>
            <p className="text-xs text-zinc-500">Upload your shop logo (max 2MB)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {branding?.logoUrl ? (
            <div className="relative">
              <img
                src={branding.logoUrl}
                alt="Shop logo"
                className="w-24 h-24 rounded-xl object-cover border border-zinc-700"
                loading="lazy"
                decoding="async"
              />
              <button
                onClick={handleDeleteLogo}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Upload className="w-8 h-8 text-zinc-600" />
            </div>
          )}

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
              {branding?.logoUrl ? 'Change Logo' : 'Upload Logo'}
            </div>
          </label>
        </div>
      </motion.div>

      {/* Colors Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Palette className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Brand Colors</h3>
            <p className="text-xs text-zinc-500">Choose colors that represent your brand</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-xs font-medium text-zinc-400 mb-2 block">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-zinc-700"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="flex-1 h-12 rounded-xl bg-zinc-800/50 border-zinc-700 text-white font-mono"
                placeholder="#ef4444"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-zinc-400 mb-2 block">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-zinc-700"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="flex-1 h-12 rounded-xl bg-zinc-800/50 border-zinc-700 text-white font-mono"
                placeholder="#f97316"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs font-medium text-zinc-400 mb-3">Preview</p>
          <div className="flex gap-3">
            <div
              className="flex-1 h-12 rounded-lg"
              style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
            />
            <button
              className="px-6 h-12 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: formData.primaryColor }}
            >
              Primary Button
            </button>
          </div>
        </div>
      </motion.div>

      {/* Shop Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-base font-semibold text-white mb-4">Shop Information</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-zinc-400 mb-2 block">Shop Name</Label>
            <Input
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="h-12 rounded-xl bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-zinc-400 mb-2 block">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                value={branding?.subdomain || ''}
                disabled
                className="flex-1 h-12 rounded-xl bg-zinc-800/30 border-zinc-700 text-zinc-500"
              />
              <span className="text-sm text-zinc-500">.mospams.shop</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-zinc-400 mb-2 block">Invitation Code</Label>
            <div className="flex items-center gap-2">
              <Input
                value={branding?.invitationCode || ''}
                disabled
                className="flex-1 h-12 rounded-xl bg-zinc-800/30 border-zinc-700 text-white font-mono"
              />
              <Button
                onClick={handleRegenerateCode}
                variant="outline"
                className="h-12 rounded-xl border-zinc-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Share this code with staff to join your shop</p>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex justify-end"
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-8 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
