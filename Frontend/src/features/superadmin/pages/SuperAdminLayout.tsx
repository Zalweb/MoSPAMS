import { useState, useEffect } from 'react';
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
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { motion } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';

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
  {
    title: 'ACCOUNT',
    items: [
      { to: '/superadmin/profile', label: 'User Profile', icon: User },
      { to: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<{ pendingShops: number; expiringSubscriptions: any[] }>({ pendingShops: 0, expiringSubscriptions: [] });

  const fetchNotifications = () => {
    apiGet<{ pendingShops: number; expiringSubscriptions: any[] }>('/api/superadmin/notifications')
      .then(setNotifData)
      .catch(() => {});
  };

  useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 60000); return () => clearInterval(t); }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-zinc-300 font-sans selection:bg-zinc-700 flex">
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-card border-r border-border flex flex-col w-[260px] shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-[70px] border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-xl bg-muted border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/images/logo.svg" alt="MoSPAMS" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-foreground tracking-tight leading-none block">MoSPAMS</span>
            <span className="block text-[10px] text-muted-foreground font-semibold tracking-wider leading-none mt-1">PLATFORM</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-bold text-muted-foreground tracking-wider mb-2 uppercase">{section.title}</h3>
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
                          ? 'bg-zinc-800 text-foreground border-l-2 border-white'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <item.icon className={`w-[16px] h-[16px] transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-zinc-300'}`} strokeWidth={1.75} />
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
        <header className="flex items-center gap-4 px-6 h-[70px] bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-2 rounded-lg hover:bg-muted text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors mr-1"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                className="relative p-2 rounded-xl hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="w-5 h-5" />
                {(notifData.pendingShops > 0 || notifData.expiringSubscriptions.length > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notifData.pendingShops + notifData.expiringSubscriptions.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-[320px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl shadow-black/50 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">Notifications</p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {notifData.pendingShops === 0 && notifData.expiringSubscriptions.length === 0 ? (
                        <p className="text-center text-muted-foreground text-xs py-8">No new notifications</p>
                      ) : (
                        <>
                          {notifData.pendingShops > 0 && (
                            <button onClick={() => { setNotifOpen(false); navigate('/superadmin/shops/pending'); }} className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-zinc-800/30 transition-colors">
                              <p className="text-xs font-semibold text-amber-400">{notifData.pendingShops} shop{notifData.pendingShops > 1 ? 's' : ''} pending approval</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Review and approve new shop registrations</p>
                            </button>
                          )}
                          {notifData.expiringSubscriptions.map((s: any, i: number) => (
                            <button key={i} onClick={() => { setNotifOpen(false); navigate('/superadmin/billing/overdue'); }} className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-zinc-800/30 transition-colors">
                              <p className="text-xs font-semibold text-red-400">{s.shopName}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Subscription expiring in {s.daysLeft} day{s.daysLeft !== 1 ? 's' : ''}</p>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-zinc-800" />
            <div className="relative">
              <motion.button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-all"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-bold text-foreground">
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground leading-none mt-1">SuperAdmin</p>
                </div>
              </motion.button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-[220px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl shadow-black/50 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/superadmin/profile'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 transition-colors"
                      >
                        <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        User Profile
                      </button>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
