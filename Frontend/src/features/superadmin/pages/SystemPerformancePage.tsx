import { useEffect, useState } from 'react';
import { Activity, Database, Server, Users, Store, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSystemHealth, type SystemHealth } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

export default function SystemPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SystemHealth | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadSystemHealth();
  }, []);

  async function loadSystemHealth() {
    setLoading(true);
    try {
      const response = await getSystemHealth();
      setData(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load system health', error);
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.4 } },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">System Performance</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">
            Monitor platform health and performance metrics
          </p>
        </div>

        <button
          onClick={loadSystemHealth}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : data ? (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          {/* System Status */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5" strokeWidth={2} />
                System Status
              </h2>
              <div className="flex items-center gap-2">
                {data.database.ok ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                    <span className="text-sm font-semibold text-emerald-400">All Systems Operational</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={2} />
                    <span className="text-sm font-semibold text-red-400">System Issues Detected</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    data.database.ok 
                      ? 'bg-emerald-500/10 border border-emerald-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <Database className={`w-5 h-5 ${data.database.ok ? 'text-emerald-400' : 'text-red-400'}`} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Database</p>
                    <p className={`text-xs ${data.database.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.database.ok ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-2">{data.database.message}</p>
              </div>

              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-400" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Platform Version</p>
                    <p className="text-xs text-blue-400">{data.version}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Generated: {new Date(data.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Platform Metrics */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5" strokeWidth={2} />
              Platform Metrics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={Store}
                label="Total Shops"
                value={data.counts.shops}
                color="blue"
              />
              <MetricCard
                icon={Users}
                label="Total Users"
                value={data.counts.users}
                color="emerald"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Pending Shops"
                value={data.counts.pendingShops}
                color="amber"
              />
              <MetricCard
                icon={CheckCircle}
                label="Active Subscriptions"
                value={data.counts.activeSubscriptions}
                color="green"
              />
            </div>
          </motion.div>

          {/* System Information */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Server className="w-5 h-5" strokeWidth={2} />
              System Information
            </h2>

            <div className="space-y-3">
              <InfoRow label="Platform Version" value={data.version} />
              <InfoRow label="Database Status" value={data.database.ok ? 'Connected' : 'Disconnected'} />
              <InfoRow label="Total Shops" value={data.counts.shops.toString()} />
              <InfoRow label="Total Users" value={data.counts.users.toString()} />
              <InfoRow label="Pending Approvals" value={data.counts.pendingShops.toString()} />
              <InfoRow label="Active Subscriptions" value={data.counts.activeSubscriptions.toString()} />
              <InfoRow label="Last Refresh" value={lastRefresh.toLocaleString()} />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-lg font-semibold text-white mb-2">Unable to Load System Health</h3>
          <p className="text-zinc-400 mb-4">Failed to retrieve system performance data</p>
          <button
            onClick={loadSystemHealth}
            className="px-6 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { 
  icon: any; 
  label: string; 
  value: number; 
  color: 'blue' | 'emerald' | 'amber' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}
