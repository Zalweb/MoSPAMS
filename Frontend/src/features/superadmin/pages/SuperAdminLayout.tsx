import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [{ to: '/superadmin/analytics', label: 'Dashboard (Home)', icon: LayoutDashboard }],
  },
  {
    title: 'SHOPS MANAGEMENT',
    items: [
      { to: '/superadmin/shops', label: 'All Shops', icon: Building2 },
      { to: '/superadmin/shops/pending', label: 'Pending Approvals', icon: HeartHandshake },
      { to: '/superadmin/shops/new', label: 'Create New Shop', icon: Store },
      { to: '/superadmin/shops/suspended', label: 'Suspended Shops', icon: Shield },
    ],
  },
  {
    title: 'BILLING & REVENUE',
    items: [
      { to: '/superadmin/subscriptions', label: 'Subscription Plans', icon: CreditCard },
      { to: '/superadmin/billing/payments', label: 'Payments History', icon: FileText },
      { to: '/superadmin/billing/reports', label: 'Revenue Reports', icon: TrendingUp },
      { to: '/superadmin/billing/overdue', label: 'Overdue Accounts', icon: Bell },
    ],
  },
  {
    title: 'PLATFORM ADMINS',
    items: [
      { to: '/superadmin/access-control', label: 'Admin Users', icon: Users },
      { to: '/superadmin/admins/new', label: 'Add Platform Admin', icon: Shield },
    ],
  },
  {
    title: 'ANALYTICS & REPORTS',
    items: [
      { to: '/superadmin/reports/revenue', label: 'Revenue Analytics', icon: BarChart3 },
      { to: '/superadmin/reports/growth', label: 'Shop Growth Trends', icon: TrendingUp },
      { to: '/superadmin/reports/users', label: 'User Statistics', icon: Users },
      { to: '/superadmin/reports/performance', label: 'System Performance', icon: Activity },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { to: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
      { to: '/superadmin/audit-logs', label: 'Audit Logs', icon: Activity },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { to: '/superadmin/support/tickets', label: 'Support Tickets', icon: LifeBuoy },
      { to: '/superadmin/support/feedback', label: 'Shop Feedback', icon: MessageSquare },
    ],
  },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-zinc-700 flex">
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col w-[260px] shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-[70px] border-b border-zinc-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/images/logo.svg" alt="MoSPAMS" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight leading-none block">MoSPAMS</span>
            <span className="block text-[10px] text-zinc-400 font-semibold tracking-wider leading-none mt-1">PLATFORM</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-bold text-zinc-500 tracking-wider mb-2 uppercase">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-zinc-800 text-white border-l-2 border-white'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <item.icon className={`w-[16px] h-[16px] transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 min-h-screen flex flex-col">
        <header className="flex items-center gap-4 px-6 h-[70px] bg-black/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-30 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-2 rounded-lg hover:bg-zinc-900 text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-all"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
                  <p className="text-xs text-zinc-500 leading-none mt-1">SuperAdmin</p>
                </div>
              </motion.button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-[220px] bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl shadow-black/50 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}
