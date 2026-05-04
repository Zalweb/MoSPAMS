import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, AlertCircle, Store, Calendar, Mail, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getShops, approveShopRegistration, rejectShopRegistration, type SuperAdminShop } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

export default function PendingShopsPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<SuperAdminShop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadPendingShops();
  }, []);

  async function loadPendingShops() {
    setLoading(true);
    try {
      const response = await getShops();
      const pending = response.data.filter(shop => shop.statusCode === 'PENDING');
      setShops(pending);
    } catch (error) {
      console.error('Failed to load pending shops', error);
      toast.error('Failed to load pending shops');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(shopId: number) {
    setActionLoading(true);
    try {
      const result = await approveShopRegistration(shopId);
      
      const trialLabel = result.data.trialEndsAt
        ? ` Trial ends: ${new Date(result.data.trialEndsAt).toLocaleDateString()}.`
        : '';

      if (result.message === 'Shop already approved.') {
        toast.info(`Shop was already approved.${trialLabel}`);
      } else if (result.data.temporaryPassword) {
        toast.success(`Shop approved! Temporary password: ${result.data.temporaryPassword}.${trialLabel}`);
      } else {
        toast.success(`Shop approved! Owner account already exists.${trialLabel}`);
      }
      
      await loadPendingShops();
      setSelectedShop(null);
    } catch (error) {
      console.error('Failed to approve shop', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve shop';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(shopId: number) {
    setActionLoading(true);
    try {
      await rejectShopRegistration(shopId, { reason: rejectReason });
      toast.success('Shop registration rejected');
      await loadPendingShops();
      setSelectedShop(null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject shop', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject shop';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Pending Approvals</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Review and approve shop registration requests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : shops.length === 0 ? (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
          <p className="text-zinc-400">No pending shop approvals at the moment</p>
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
                <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                  Pending
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{shop.shopName}</h3>
              <p className="text-sm text-zinc-400 mb-4">Shop ID: #{shop.shopId}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <User className="w-4 h-4" strokeWidth={2} />
                  <span>{shop.applicantName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Mail className="w-4 h-4" strokeWidth={2} />
                  <span className="truncate">{shop.applicantEmail || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="w-4 h-4" strokeWidth={2} />
                  <span>{shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedShop(shop)}
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  Review
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedShop.shopName}</h2>
                <p className="text-sm text-zinc-400">Review shop registration details</p>
              </div>
              <button
                onClick={() => setSelectedShop(null)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">Shop Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Shop Name:</span>
                    <span className="text-sm text-white font-medium">{selectedShop.shopName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Email:</span>
                    <span className="text-sm text-white">{selectedShop.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Phone:</span>
                    <span className="text-sm text-white">{selectedShop.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Address:</span>
                    <span className="text-sm text-white text-right">{selectedShop.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">Applicant Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Name:</span>
                    <span className="text-sm text-white font-medium">{selectedShop.applicantName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Email:</span>
                    <span className="text-sm text-white">{selectedShop.applicantEmail || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Applied On:</span>
                    <span className="text-sm text-white">
                      {selectedShop.createdAt ? new Date(selectedShop.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedShop.shopId)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" strokeWidth={2} />
                {actionLoading ? 'Approving...' : 'Approve Shop'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" strokeWidth={2} />
                Reject
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 max-w-md w-full"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Reject Shop Registration</h3>
                <p className="text-sm text-zinc-400">Provide a reason for rejection (optional)</p>
              </div>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 mb-4 min-h-[100px]"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedShop.shopId)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
