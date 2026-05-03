import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X, Bell, ClipboardCheck,
  Home, Calendar, CreditCard, Users, ScrollText, Settings,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useData } from '@/shared/contexts/DataContext';
import { NAV_ACCESS } from '@/shared/lib/permissions';
import { normalizeRole } from '@/shared/lib/roles';

const navItems: { label: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Inventory', to: '/dashboard/inventory', icon: Package },
  { label: 'Service Jobs', to: '/dashboard/services', icon: Wrench },
  { label: 'Sales', to: '/dashboard/sales', icon: ShoppingCart },
  { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
  { label: 'Users', to: '/dashboard/users', icon: Shield },
  { label: 'Approvals', to: '/dashboard/approvals', icon: ClipboardCheck },
  { label: 'Roles', to: '/dashboard/roles', icon: Users },
  { label: 'Activity Logs', to: '/dashboard/activity-logs', icon: ScrollText },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  // Customer navigation
  { label: 'Home', to: '/dashboard/customer', icon: Home, end: true },
  { label: 'Book', to: '/dashboard/customer/book', icon: Calendar },
  { label: 'History', to: '/dashboard/customer/history', icon: Wrench },
  { label: 'Payments', to: '/dashboard/customer/payments', icon: CreditCard },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { parts } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const lowStock = parts.filter(p => p.stock <= p.minStock);
  const role = normalizeRole(user?.role);
  const visibleNav = navItems.filter(item => role ? (NAV_ACCESS[item.to] ?? []).includes(role) : false);

  const currentLabel = navItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/dashboard')?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : '');

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex font-sans">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 z-40 lg:hidden backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-[#F0EFED] flex flex-col w-[220px] shrink-0 transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-[#F0EFED]">
          <div className="w-7 h-7 rounded-[9px] bg-[#1C1917] flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[13px] font-bold text-[#1C1917] tracking-tight leading-none">MoSPAMS</span>
            <span className="block text-[9px] text-[#D6D3D1] font-medium leading-none mt-0.5">
              {user?.shopName ? user.shopName.toUpperCase() : 'MANAGEMENT'}
            </span>
          </div>
          <button className="ml-auto lg:hidden p-1 text-[#D6D3D1] hover:text-[#78716C]" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `w-full flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#1C1917] text-white shadow-sm'
                  : 'text-[#A8A29E] hover:text-[#44403C] hover:bg-[#F5F5F4]'
              }`}
            >
              <item.icon className="w-[15px] h-[15px]" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

      </aside>

      <main className="flex-1 min-w-0 min-h-screen">
        <div className="flex items-center gap-3 px-4 lg:px-8 h-[52px] bg-white border-b border-[#F0EFED] sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E]">
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[14px] font-semibold text-[#1C1917] tracking-tight">{currentLabel}</span>

          <div className="ml-auto flex items-center gap-1">
            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => { setBellOpen(o => !o); setProfileOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-[#F5F5F4] text-[#78716C]"
                aria-label="Low stock alerts"
              >
                <Bell className="w-4 h-4" strokeWidth={1.75} />
                {lowStock.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                    {lowStock.length}
                  </span>
                )}
              </button>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[280px] bg-white rounded-2xl border border-[#F0EFED] shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#F5F5F4] flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-[#1C1917]">Low Stock Alerts</p>
                      <span className="text-[10px] text-[#A8A29E]">{lowStock.length} items</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#FAFAF9]">
                      {lowStock.length === 0 && <p className="text-[12px] text-[#A8A29E] text-center py-6">All stock healthy</p>}
                      {lowStock.map(p => (
                        <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#44403C] truncate">{p.name}</p>
                            <p className="text-[10px] text-[#D6D3D1]">{p.category}</p>
                          </div>
                          <span className={`text-[12px] font-bold ${p.stock === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                            {p.stock} / {p.minStock}
                          </span>
                        </div>
                      ))}
                    </div>
                    {lowStock.length > 0 && (
                      <button
                        onClick={() => { setBellOpen(false); navigate('/dashboard/inventory'); }}
                        className="w-full px-4 py-2.5 text-[11px] font-medium text-[#3B82F6] hover:bg-[#FAFAF9] border-t border-[#F5F5F4]"
                      >
                        View Inventory →
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-[#F0EFED] mx-1" />

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(o => !o); setBellOpen(false); }}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-[#F5F5F4] transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-[#1C1917] flex items-center justify-center text-[11px] font-bold text-white">
                  {user?.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold text-[#44403C] leading-none">{user?.name}</p>
                  <p className="text-[10px] text-[#A8A29E] leading-none mt-0.5">{user?.role}</p>
                </div>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-2xl border border-[#F0EFED] shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#F5F5F4]">
                      <p className="text-[12px] font-semibold text-[#1C1917] truncate">{user?.name}</p>
                      <p className="text-[10px] text-[#A8A29E] mt-0.5">{user?.role}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-medium text-[#A8A29E] hover:text-[#EF4444] hover:bg-red-50/50 transition-all"
                    >
                      <LogOut className="w-[14px] h-[14px]" strokeWidth={1.5} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
