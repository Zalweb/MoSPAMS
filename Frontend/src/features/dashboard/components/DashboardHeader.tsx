import { motion } from 'framer-motion';
import { Moon, Sun, FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useShop } from '@/shared/contexts/ShopContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';

export function DashboardHeader() {
  const { shop } = useShop();
  const { theme, toggleTheme } = useTheme();
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Dashboard Overview</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-zinc-700 transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => navigate('/dashboard/reports')}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Create Report</span>
        </button>

        <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center overflow-hidden">
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
