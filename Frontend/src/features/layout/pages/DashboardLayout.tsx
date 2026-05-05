import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X, ClipboardCheck,
  Home, Calendar, CreditCard, ScrollText, Settings, Bike,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { NAV_ACCESS } from '@/shared/lib/permissions';
import { normalizeRole } from '@/shared/lib/roles';
import { useTheme } from 'next-themes';

const navItems: { label: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Inventory', to: '/dashboard/inventory', icon: Package },
  { label: 'Service Jobs', to: '/dashboard/services', icon: Wrench },
  { label: 'Sales', to: '/dashboard/sales', icon: ShoppingCart },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
  { label: 'Users', to: '/dashboard/users', icon: Shield },
  { label: 'Approvals', to: '/dashboard/approvals', icon: ClipboardCheck },
  // Customer navigation
  { label: 'Home', to: '/dashboard/customer', icon: Home, end: true },
  { label: 'Book', to: '/dashboard/customer/book', icon: Calendar },
  { label: 'History', to: '/dashboard/customer/history', icon: Wrench },
  { label: 'Payments', to: '/dashboard/customer/payments', icon: CreditCard },
  // Mechanic navigation
  { label: 'My Jobs', to: '/dashboard/mechanic/jobs', icon: Wrench },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = normalizeRole(user?.role);
  const visibleNav = navItems.filter(item => role ? (NAV_ACCESS[item.to] ?? []).includes(role) : false);

  const currentLabel = navItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : '');

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  return (
    <div className="min-h-screen bg-black flex font-sans">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col w-[260px] shrink-0 transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-[64px] border-b border-zinc-800">
          <motion.div
            className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg"
            whileHover={{ rotate: 10 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Bike className="w-5 h-5 text-black" />
          </motion.div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight leading-none">
              Mo<span className="text-zinc-500">SPAMS</span>
            </span>
            <span className="block text-[10px] text-zinc-600 font-medium leading-none mt-1">
              {user?.shopName ? user.shopName.toUpperCase() : 'MANAGEMENT'}
            </span>
          </div>
          <button
            className="ml-auto lg:hidden p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-black shadow-lg shadow-black/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            </motion.div>
          ))}
        </nav>


      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50">
          <div className="flex items-center gap-4 px-6 h-[64px]">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <h1 className="text-base font-semibold text-white tracking-tight">{currentLabel}</h1>

            {/* Right side actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Divider */}
              <div className="w-px h-6 bg-zinc-800" />

              {/* Profile */}
              <div className="relative">
                <motion.button
                  onClick={() => { setProfileOpen(o => !o); }}
                  className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
                    <p className="text-xs text-zinc-500 leading-none mt-1">{user?.role}</p>
                  </div>
                </motion.button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-[220px] bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl shadow-black/50 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        {role === 'Owner' && (
                          <>
                            <button
                              onClick={() => { setProfileOpen(false); navigate('/dashboard/activity-logs'); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                            >
                              <ScrollText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                              Activity Logs
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); navigate('/dashboard/settings'); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                            >
                              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
                              Settings
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border-t border-zinc-800"
                      >
                        <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}