import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useShop } from '@/shared/contexts/ShopContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';

export function DashboardHeader() {
  const { shop } = useShop();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between mb-8"
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
        </div>
        <p className="text-sm text-zinc-400">Dashboard Overview</p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <ThemeCustomizer />

        <button
          onClick={() => navigate('/dashboard/reports')}
          className="h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            background: `linear-gradient(to right, hsl(var(--accent)), var(--accent-hex))`,
          }}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Create Report</span>
        </button>

        <div className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center overflow-hidden">
          {shop?.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.shopName} className="w-full h-full rounded-xl object-cover" loading="lazy" decoding="async" />
          ) : (
            <img src="/images/logo.svg" alt="MoSPAMS" className="w-7 h-7 object-contain" loading="lazy" decoding="async" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
