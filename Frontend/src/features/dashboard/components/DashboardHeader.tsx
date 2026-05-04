import { motion } from 'framer-motion';
import { Search, Bell, Moon, Sun, FileText } from 'lucide-react';
import { useShop } from '@/shared/contexts/ShopContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';

export function DashboardHeader() {
  const { shop } = useShop();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between mb-8"
    >
      {/* Welcome Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
        </div>
        <p className="text-sm text-zinc-400">Dashboard Overview</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Type to search..."
            className="w-64 h-10 pl-10 pr-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[rgb(var(--color-primary-rgb))] rounded-full border-2 border-zinc-950" />
        </button>

        {/* Create Report Button */}
        <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Create Report</span>
        </button>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 border border-[rgb(var(--color-primary-rgb))]/30 flex items-center justify-center">
          {shop?.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.shopName} className="w-full h-full rounded-xl object-cover" loading="lazy" decoding="async" />
          ) : (
            <span className="text-sm font-semibold text-[rgb(var(--color-primary-rgb))]">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
