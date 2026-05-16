import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Upload, X, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { useShop } from '@/shared/contexts/ShopContext';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';
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

function removeWhiteBackground(file: File, tolerance = 40): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        // Use top-left corner pixel as background color seed
        const bgR = data[0], bgG = data[1], bgB = data[2];

        const colorMatch = (pixelIdx: number) =>
          Math.abs(data[pixelIdx] - bgR) <= tolerance &&
          Math.abs(data[pixelIdx + 1] - bgG) <= tolerance &&
          Math.abs(data[pixelIdx + 2] - bgB) <= tolerance;

        // BFS flood-fill from all border pixels — only removes background
        // connected to the edges, preserving any same-color areas inside the logo
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        const seed = (x: number, y: number) => {
          const i = y * width + x;
          if (!visited[i] && colorMatch(i * 4)) { visited[i] = 1; queue.push(i); }
        };

        for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
        for (let y = 1; y < height - 1; y++) { seed(0, y); seed(width - 1, y); }

        while (queue.length > 0) {
          const idx = queue.pop()!;
          data[idx * 4 + 3] = 0;
          const x = idx % width, y = Math.floor(idx / width);
          if (x > 0)         { const n = idx - 1;     if (!visited[n] && colorMatch(n * 4)) { visited[n] = 1; queue.push(n); } }
          if (x < width - 1) { const n = idx + 1;     if (!visited[n] && colorMatch(n * 4)) { visited[n] = 1; queue.push(n); } }
          if (y > 0)         { const n = idx - width;  if (!visited[n] && colorMatch(n * 4)) { visited[n] = 1; queue.push(n); } }
          if (y < height - 1){ const n = idx + width;  if (!visited[n] && colorMatch(n * 4)) { visited[n] = 1; queue.push(n); } }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Canvas export failed')),
          'image/png'
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

export default function ShopBrandingSettings() {
  const { refetch } = useShop();
  const { refreshBranding } = useTenantBranding();
  const [branding, setBranding] = useState<ShopBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [pendingDeleteLogo, setPendingDeleteLogo] = useState(false);

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

      if (pendingDeleteLogo) {
        await apiMutation('/api/shop/logo', 'DELETE');
        setPendingDeleteLogo(false);
      }

      if (pendingLogo) {
        const fd = new FormData();
        fd.append('logo', pendingLogo.blob, 'logo.png');
        const response = await fetch('/api/shop/logo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: fd,
        });
        if (!response.ok) throw new Error('Logo upload failed');
        URL.revokeObjectURL(pendingLogo.previewUrl);
        setPendingLogo(null);
      }

      await apiMutation('/api/shop/branding', 'PATCH', formData);
      toast.success('Shop branding updated successfully');
      await refreshBranding();
      await refetch();
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
    e.target.value = '';

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    try {
      let blob: Blob = file;
      if (file.type !== 'image/svg+xml') {
        try {
          blob = await removeWhiteBackground(file);
        } catch (bgErr) {
          console.warn('Background removal failed, using original:', bgErr);
        }
      }

      if (pendingLogo) URL.revokeObjectURL(pendingLogo.previewUrl);
      setPendingLogo({ blob, previewUrl: URL.createObjectURL(blob) });
      setPendingDeleteLogo(false);
    } catch (error) {
      console.error('Failed to process logo:', error);
      toast.error('Failed to process logo');
    }
  };

  const handleDeleteLogo = () => {
    if (pendingLogo) {
      URL.revokeObjectURL(pendingLogo.previewUrl);
      setPendingLogo(null);
    } else {
      setPendingDeleteLogo(true);
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
        <div className="w-12 h-12 border-4 border-border dark:border-zinc-700 border-t-white rounded-full animate-spin" />
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
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Shop Branding</h2>
        <p className="text-sm text-muted-foreground">Customize your shop's appearance and branding</p>
      </motion.div>

      {/* Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-card shadow-soft dark:shadow-none dark:bg-muted/50 backdrop-blur-sm border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary dark:bg-zinc-800 flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Shop Logo</h3>
            <p className="text-xs text-muted-foreground">Upload your shop logo (max 2MB)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(() => {
            const previewUrl = pendingLogo?.previewUrl;
            const savedUrl = !pendingDeleteLogo ? branding?.logoUrl : null;
            const displayUrl = previewUrl ?? savedUrl;

            return displayUrl ? (
              <div className="relative">
                <img
                  src={displayUrl}
                  alt="Shop logo"
                  className="w-24 h-24 rounded-xl object-contain border border-border dark:border-zinc-700"
                />
                {pendingLogo && (
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-[9px] text-amber-400 font-medium">Unsaved</span>
                )}
                <button
                  onClick={handleDeleteLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            ) : (
              <div className="relative w-24 h-24 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border border-border dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                <img
                  src="/images/logo.svg"
                  alt="Default MoSPAMS logo"
                  className="w-20 h-20 object-contain opacity-60"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-muted-foreground font-medium">Default</span>
              </div>
            );
          })()}

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="px-4 py-2 rounded-xl bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-sm font-medium text-foreground hover:bg-muted dark:bg-zinc-700 transition-colors">
              {(branding?.logoUrl || pendingLogo) ? 'Change Logo' : 'Upload Logo'}
            </div>
          </label>
        </div>
      </motion.div>

      {/* Colors Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-card shadow-soft dark:shadow-none dark:bg-muted/50 backdrop-blur-sm border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary dark:bg-zinc-800 flex items-center justify-center">
            <Palette className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Brand Colors</h3>
            <p className="text-xs text-muted-foreground">Choose colors that represent your brand</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-border dark:border-zinc-700"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="flex-1 h-12 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-foreground font-mono"
                placeholder="#ef4444"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Secondary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-border dark:border-zinc-700"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="flex-1 h-12 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-foreground font-mono"
                placeholder="#f97316"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 p-4 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border border-border dark:border-zinc-700">
          <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
          <div className="flex gap-3">
            <div
              className="flex-1 h-12 rounded-lg"
              style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
            />
            <button
              className="px-6 h-12 rounded-lg font-semibold text-foreground transition-opacity hover:opacity-90"
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
        className="bg-card shadow-soft dark:shadow-none dark:bg-muted/50 backdrop-blur-sm border border-border rounded-2xl p-6"
      >
        <h3 className="text-base font-semibold text-foreground mb-4">Shop Information</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Shop Name</Label>
            <Input
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="h-12 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-foreground"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                value={branding?.subdomain || ''}
                disabled
                className="flex-1 h-12 rounded-xl bg-secondary dark:bg-zinc-800/30 border-border dark:border-zinc-700 text-muted-foreground"
              />
              <span className="text-sm text-muted-foreground">.mospams.shop</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Invitation Code</Label>
            <div className="flex items-center gap-2">
              <Input
                value={branding?.invitationCode || ''}
                disabled
                className="flex-1 h-12 rounded-xl bg-secondary dark:bg-zinc-800/30 border-border dark:border-zinc-700 text-foreground font-mono"
              />
              <Button
                onClick={handleRegenerateCode}
                variant="outline"
                className="h-12 rounded-xl border-border dark:border-zinc-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Share this code with staff to join your shop</p>
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
