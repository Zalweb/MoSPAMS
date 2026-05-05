import { useState } from 'react';
import { Store, User, ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { createShop } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

export default function CreateShopPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<{ shopId: number; temporaryPassword: string } | null>(null);

  const [formData, setFormData] = useState({
    shopName: '',
    email: '',
    phone: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createShop(formData);
      setCredentials(result.data);
      setSuccess(true);
      toast.success('Shop created successfully!');
    } catch (error) {
      console.error('Failed to create shop', error);
      toast.error('Failed to create shop');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  if (success && credentials) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-950 rounded-2xl border border-zinc-800 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" strokeWidth={2} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Shop Created Successfully!</h2>
          <p className="text-zinc-400 mb-2">The shop has been created and owner credentials have been generated.</p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <span>Shop Domain:</span>
            <span className="font-mono font-bold">{formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.mospams.shop</span>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6 text-left">
            <h3 className="text-sm font-semibold text-zinc-400 mb-4">Owner Login Credentials</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Shop Domain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.mospams.shop`}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(`${formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.mospams.shop`)}
                    className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Email</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.ownerEmail}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(formData.ownerEmail)}
                    className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={credentials.temporaryPassword}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(credentials.temporaryPassword)}
                    className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Shop ID</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={credentials.shopId}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(credentials.shopId.toString())}
                    className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠️ Make sure to save these credentials. The temporary password will not be shown again.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/superadmin/shops')}
              className="flex-1 px-6 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-semibold hover:bg-zinc-700 transition-colors"
            >
              View All Shops
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setCredentials(null);
                setFormData({
                  shopName: '',
                  email: '',
                  phone: '',
                  address: '',
                  ownerName: '',
                  ownerEmail: '',
                });
              }}
              className="flex-1 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              Create Another Shop
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/superadmin/shops')}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Create New Shop</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manually create a new shop and owner account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-6">
        {/* Shop Information */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" strokeWidth={2} />
            Shop Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Shop Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                placeholder="Enter shop name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              />
              {formData.shopName && (
                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-2">
                  <span>Domain will be:</span>
                  <span className="font-mono text-blue-400">
                    {formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop-name'}.mospams.shop
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Shop Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="shop@example.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Shop Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Shop Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="pt-6 border-t border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" strokeWidth={2} />
            Owner Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Owner Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="Enter owner full name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Owner Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="owner@example.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-1">This will be used as the login email for the shop owner</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6 border-t border-zinc-800 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/shops')}
            className="flex-1 px-6 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Shop...' : 'Create Shop'}
          </button>
        </div>
      </form>
    </div>
  );
}
