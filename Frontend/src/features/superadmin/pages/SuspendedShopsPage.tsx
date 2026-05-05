import { useEffect, useState } from 'react';
import { Shield, RefreshCw, AlertTriangle, Store, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getShops, setShopStatus, type SuperAdminShop } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

export default function SuspendedShopsPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSuspendedShops();
  }, []);

  async function loadSuspendedShops() {
    setLoading(true);
    try {
      const response = await getShops();
      const suspended = response.data.filter(shop => shop.statusCode === 'SUSPENDED');
      setShops(suspended);
    } catch (error) {
      console.error('Failed to load suspended shops', error);
      toast.error('Failed to load suspended shops');
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate(shopId: number, shopName: string) {
    setActionLoading(true);
    try {
      await setShopStatus(shopId, 'activate');
      toast.success(`${shopName} has been reactivated`);
      await loadSuspendedShops();
    } catch (error) {
      console.error('Failed to reactivate shop', error);
      toast.error('Failed to reactivate shop');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Suspended Shops</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shops that have been suspended</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : shops.length === 0 ? (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-lg font-semibold text-white mb-2">No Suspended Shops</h3>
          <p className="text-zinc-400">All shops are currently active</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <motion.div
              key={shop.shopId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" strokeWidth={2} />
                </div>
                <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                  Suspended
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{shop.shopName}</h3>
              <p className="text-sm text-zinc-400 mb-4">Shop ID: #{shop.shopId}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Store className="w-4 h-4" strokeWidth={2} />
                  <span>{shop.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="w-4 h-4" strokeWidth={2} />
                  <span>Created: {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <button
                onClick={() => handleReactivate(shop.shopId, shop.shopName)}
                disabled={actionLoading}
                className="w-full px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                {actionLoading ? 'Reactivating...' : 'Reactivate Shop'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
