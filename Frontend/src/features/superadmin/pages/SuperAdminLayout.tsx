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
  MessageSquare,
  Settings,
  Shield,
  Store,
  TrendingUp,
  Users,
  User,
  Sun,
  Moon,
  ChevronLeft,
} from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    mobileIcon: LayoutDashboard,
    items: [{ to: '/superadmin/analytics', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'SHOPS',
    mobileIcon: Store,
    items: [
      { to: '/superadmin/shops', label: 'All Shops', icon: Building2, end: true },
      { to: '/superadmin/shops/pending', label: 'Pending', icon: HeartHandshake },
      { to: '/superadmin/shops/new', label: 'New Shop', icon: Store },
      { to: '/superadmin/shops/suspended', label: 'Suspended', icon: Shield },
    ],
  },
  {
    title: 'BILLING',
    mobileIcon: CreditCard,
    items: [
      { to: '/superadmin/subscriptions', label: 'Plans', icon: CreditCard },
      { to: '/superadmin/billing/payments', label: 'Payments', icon: FileText },
      { to: '/superadmin/billing/reports', label: 'Revenue', icon: TrendingUp },
      { to: '/superadmin/billing/overdue', label: 'Overdue', icon: Bell },
    ],
  },
  {
    title: 'ADMINS',
    mobileIcon: Users,
    items: [
      { to: '/superadmin/access-control', label: 'Admin Users', icon: Users },
      { to: '/superadmin/admins/new', label: 'Add Admin', icon: Shield },
    ],
  },
  {
    title: 'REPORTS',
    mobileIcon: BarChart3,
    items: [
      { to: '/superadmin/reports/revenue', label: 'Analytics', icon: BarChart3 },
      { to: '/superadmin/reports/growth', label: 'Growth', icon: TrendingUp },
      { to: '/superadmin/reports/users', label: 'Users', icon: Users },
      { to: '/superadmin/reports/performance', label: 'Performance', icon: Activity },
    ],
  },
  {
    title: 'SYSTEM',
    mobileIcon: Settings,
    items: [
      { to: '/superadmin/audit-logs', label: 'Audit Logs', icon: Activity },
      { to: '/superadmin/support/tickets', label: 'Tickets', icon: LifeBuoy },
      { to: '/superadmin/support/feedback', label: 'Feedback', icon: MessageSquare },
    ],
  },
];

const COLLAPSED_W = 84;
const EXPANDED_W = 260;

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeMobileGroup, setActiveMobileGroup] = useState<string | null>(null);
  const [notifData, setNotifData] = useState<{ pendingShops: number; expiringSubscriptions: any[] }>({ pendingShops: 0, expiringSubscriptions: [] });

  const fetchNotifications = () => {
    apiGet<{ pendingShops: number; expiringSubscriptions: any[] }>('/api/superadmin/notifications')
      .then(setNotifData)
      .catch(() => {});
  };

  useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    setActiveMobileGroup(null);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentItem = allItems.find(item => item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
  const currentLabel = currentItem ? currentItem.label : 'Admin Portal';

  return (
    <div
      className="h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-muted flex"
      style={{
        '--primary': 'var(--foreground)',
        '--primary-foreground': 'var(--background)',
        '--brand-gradient': 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--foreground)))',
        '--brand-surface-gradient': 'linear-gradient(135deg, hsl(var(--foreground) / 0.05), transparent)',
        '--brand-border': 'hsl(var(--foreground) / 0.1)',
        '--brand-glow': '0 4px 14px 0 hsl(var(--foreground) / 0.1)',
        '--brand-text-on-primary': 'hsl(var(--background))'
      } as React.CSSProperties}
    >
      
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? COLLAPSED_W : EXPANDED_W }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className={`hidden lg:flex h-[calc(100vh-32px)] ml-4 my-4 flex-col shrink-0 z-50 rounded-[32px]`}
        style={{
          background: 'hsl(var(--foreground))',
          boxShadow: '0 4px 30px -5px rgba(0,0,0,0.2)'
        }}
      >
        {/* Logo area */}
        <div className={`flex items-center h-[90px] w-full shrink-0 relative ${isCollapsed ? 'justify-center' : 'px-5 justify-between'}`}>
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-background/10 transition-transform hover:scale-105"
          >
            <Shield className="w-5 h-5 text-background" strokeWidth={2} />
          </button>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="ml-3 min-w-0 flex-1"
              >
                <span className="text-[15px] font-black text-background tracking-tight leading-tight block uppercase">
                  Platform
                </span>
                <span className="text-[10px] font-bold text-background/60 tracking-widest uppercase block">
                  MoSPAMS
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`hidden lg:block transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
              <button
                onClick={() => setIsCollapsed(true)}
                className="w-7 h-7 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center text-background/70 hover:text-background transition-colors"
              >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 -mr-5 pr-5">
          {NAV_SECTIONS.map((group, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
              {idx > 0 && (
                <div className="mx-4 my-2 border-t border-background/10" />
              )}

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-5 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] whitespace-nowrap text-background/40"
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className={`space-y-0.5 ${isCollapsed ? 'px-2' : 'pl-3 pr-0'}`}>
                {group.items.map(item => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

                  return (
                    <div key={item.to} className="relative group/tip">
                      <NavLink to={item.to} end={item.end} className="block relative">
                        {isActive && (
                          <motion.div
                            layoutId="superadmin-active-tab"
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                            className={`absolute z-0 bg-background ${
                              isCollapsed 
                                ? 'inset-0 m-auto w-12 h-12 rounded-full' 
                                : 'inset-y-0 left-0 w-full rounded-l-[24px] rounded-r-none shadow-[2px_0_0_0_hsl(var(--background))]'
                            }`}
                          >
                            {!isCollapsed && (
                              <>
                                <div className="absolute -top-[24px] -right-[2px] w-[26px] h-[24px] text-background pointer-events-none z-20">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
                                    <path d="M24 0V24H0C13.2548 24 24 13.2548 24 0Z" fill="currentColor" />
                                  </svg>
                                </div>
                                <div className="absolute -bottom-[24px] -right-[2px] w-[26px] h-[24px] text-background pointer-events-none z-20">
                                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
                                    <path d="M24 24V0H0C13.2548 0 24 10.7452 24 24Z" fill="currentColor" />
                                  </svg>
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}

                        <div
                          className={`flex items-center transition-colors duration-300 relative z-10 ${
                            isCollapsed 
                              ? 'justify-center w-12 h-12 mx-auto rounded-full' 
                              : `h-[52px] ${isActive ? 'pl-5' : 'w-[calc(100%-12px)] rounded-full mr-3 px-4'}`
                          } ${
                            isActive 
                              ? 'text-foreground' 
                              : 'text-background/70 hover:bg-background/10 hover:text-background'
                          }`}
                        >
                          <item.icon
                            className={`shrink-0 transition-all duration-300 ${
                              isCollapsed ? 'w-5 h-5' : 'w-[20px] h-[20px]'
                            } ${isActive && isCollapsed ? 'scale-110' : ''}`}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15 }}
                                className="text-[13px] font-medium tracking-normal whitespace-nowrap ml-4"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </NavLink>

                      {isCollapsed && (
                        <div
                          className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-bold opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-[100] shadow-xl"
                        >
                          {item.label}
                          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </motion.aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-4 px-6 h-[64px]">

            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-foreground flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-background" strokeWidth={2.5} />
              </div>
            </div>

            <h1 className="text-base font-bold text-foreground tracking-tight ml-2 lg:ml-0 uppercase">{currentLabel}</h1>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {(notifData.pendingShops > 0 || notifData.expiringSubscriptions.length > 0) && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-foreground rounded-full border-2 border-background" />
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute right-0 top-full mt-2 w-[320px] bg-card backdrop-blur-xl rounded-3xl border border-border shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-border/50">
                        <p className="text-sm font-bold text-foreground">Notifications</p>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {notifData.pendingShops === 0 && notifData.expiringSubscriptions.length === 0 ? (
                          <p className="text-center text-muted-foreground text-xs py-8 font-medium">No new notifications</p>
                        ) : (
                          <>
                            {notifData.pendingShops > 0 && (
                              <button onClick={() => { setNotifOpen(false); navigate('/superadmin/shops/pending'); }} className="w-full text-left px-5 py-4 border-b border-border/50 hover:bg-secondary/50 transition-colors">
                                <p className="text-xs font-bold text-foreground">{notifData.pendingShops} pending shop approvals</p>
                              </button>
                            )}
                            {notifData.expiringSubscriptions.map((s: any, i: number) => (
                              <button key={i} onClick={() => { setNotifOpen(false); navigate('/superadmin/billing/overdue'); }} className="w-full text-left px-5 py-4 border-b border-border/50 hover:bg-secondary/50 transition-colors">
                                <p className="text-xs font-bold text-foreground">{s.shopName}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">Expiring in {s.daysLeft} days</p>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              <div className="w-px h-5 bg-border mx-1" />

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background font-black text-sm transition-transform hover:scale-105"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute right-0 top-full mt-2 w-[240px] bg-card backdrop-blur-xl rounded-3xl border border-border shadow-2xl z-50 p-2"
                    >
                      <div className="px-3 py-3 mb-1 bg-secondary/50 rounded-2xl">
                        <p className="text-sm font-bold text-foreground truncate leading-tight">{user?.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/superadmin/profile'); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <User className="w-4 h-4" strokeWidth={2.5} /> Profile
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-xs font-bold text-foreground hover:bg-foreground/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" strokeWidth={2.5} /> Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[calc(100vh-64px)] bg-background p-6 lg:p-8 pb-32 lg:pb-8">
          <Outlet />
        </div>

        {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────────── */}
        <AnimatePresence>
          {activeMobileGroup && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-background/20 backdrop-blur-sm" 
              onClick={() => setActiveMobileGroup(null)} 
            />
          )}
        </AnimatePresence>

        <div className="lg:hidden fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none flex flex-col items-center justify-end">
          
          <AnimatePresence>
            {activeMobileGroup && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto mb-4 shadow-2xl rounded-[32px] pl-2 py-2 pr-0 w-[calc(100vw-32px)] max-w-sm flex flex-col gap-1"
                style={{ background: 'hsl(var(--foreground))' }}
              >
                <div className="px-4 py-3 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-background/40">{activeMobileGroup}</p>
                </div>
                {NAV_SECTIONS.find(g => g.title === activeMobileGroup)?.items.map(item => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                    
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setActiveMobileGroup(null)}
                      className={`relative flex items-center gap-4 px-5 py-3.5 transition-colors z-10 ${
                        isActive 
                          ? 'text-foreground' 
                          : 'rounded-[24px] mr-2 text-background/70 hover:bg-background/10 hover:text-background'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="superadmin-mobile-dropup-active"
                          className="absolute inset-y-0 left-0 w-full bg-background rounded-l-[24px] rounded-r-none z-0 shadow-[2px_0_0_0_hsl(var(--background))]"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        >
                          <div className="absolute -top-[24px] -right-[2px] w-[26px] h-[24px] text-background pointer-events-none z-20">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
                              <path d="M24 0V24H0C13.2548 24 24 13.2548 24 0Z" fill="currentColor" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-[24px] -right-[2px] w-[26px] h-[24px] text-background pointer-events-none z-20">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
                              <path d="M24 24V0H0C13.2548 0 24 10.7452 24 24Z" fill="currentColor" />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                      <item.icon className="w-5 h-5 shrink-0 relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[15px] font-bold tracking-wide relative z-10">{item.label}</span>
                    </NavLink>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <nav 
            className="pointer-events-auto flex items-center p-1.5 rounded-[28px] shadow-2xl overflow-x-auto no-scrollbar max-w-full"
            style={{ background: 'hsl(var(--foreground))' }}
          >
            {NAV_SECTIONS.map((group) => {
              const isActiveGroup = group.items.some(item => 
                item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + '/')
              );
              const isExpanded = activeMobileGroup === group.title;
              const Icon = group.mobileIcon;

              return group.items.length === 1 ? (
                <NavLink
                  key={group.title}
                  to={group.items[0].to}
                  className="relative flex items-center justify-center min-w-[52px] h-12 rounded-[22px] transition-colors z-10 shrink-0 mx-0.5"
                >
                  {isActiveGroup && !activeMobileGroup && (
                    <motion.div
                      layoutId="superadmin-mobile-active-tab"
                      className="absolute inset-0 bg-background rounded-[22px] z-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon 
                    className={`w-[22px] h-[22px] relative z-10 transition-colors ${isActiveGroup && !activeMobileGroup ? 'text-foreground' : 'text-background/50'}`} 
                    strokeWidth={isActiveGroup && !activeMobileGroup ? 2.5 : 2}
                  />
                </NavLink>
              ) : (
                <button
                  key={group.title}
                  onClick={() => setActiveMobileGroup(isExpanded ? null : group.title)}
                  className="relative flex items-center justify-center min-w-[52px] h-12 rounded-[22px] transition-colors z-10 shrink-0 mx-0.5"
                >
                  {(isActiveGroup && !activeMobileGroup || isExpanded) && (
                    <motion.div
                      layoutId="superadmin-mobile-active-tab"
                      className="absolute inset-0 bg-background rounded-[22px] z-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon 
                    className={`w-[22px] h-[22px] relative z-10 transition-colors ${(isActiveGroup && !activeMobileGroup) || isExpanded ? 'text-foreground' : 'text-background/50'}`} 
                    strokeWidth={(isActiveGroup && !activeMobileGroup) || isExpanded ? 2.5 : 2}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
}
