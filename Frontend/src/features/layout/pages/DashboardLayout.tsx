import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu,
  Home, Calendar, CreditCard, ScrollText, Settings, Bike, Bell, Sun, Moon,
  ChevronLeft, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTenantBranding, hexToHsl } from '@/shared/contexts/TenantBrandingContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { NAV_ACCESS } from '@/shared/lib/permissions';
import { normalizeRole } from '@/shared/lib/roles';
import { apiGet, apiMutation } from '@/shared/lib/api';

const navGroups = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Inventory',     to: '/dashboard/inventory', icon: Package },
      { label: 'Service Jobs',  to: '/dashboard/services',  icon: Wrench },
      { label: 'Sales',         to: '/dashboard/sales',     icon: ShoppingCart },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
      { label: 'Users',   to: '/dashboard/users',   icon: Shield },
    ],
  },
  {
    title: 'Customer',
    items: [
      { label: 'Home',        to: '/dashboard/customer',          icon: Home,        end: true },
      { label: 'Book Service',to: '/dashboard/customer/book',     icon: Calendar },
      { label: 'History',     to: '/dashboard/customer/history',  icon: Wrench },
      { label: 'Payments',    to: '/dashboard/customer/payments', icon: CreditCard },
      { label: 'Parts',       to: '/dashboard/customer/parts',    icon: Package },
      { label: 'My Garage',   to: '/dashboard/customer/vehicles', icon: Bike },
    ],
  },
  {
    title: 'Work',
    items: [
      { label: 'Assigned Jobs', to: '/dashboard/mechanic/jobs',        icon: Wrench },
      { label: 'Job History',   to: '/dashboard/mechanic/history',     icon: CheckCircle2 },
      { label: 'Performance',   to: '/dashboard/mechanic/performance', icon: BarChart3 },
    ],
  },
];

const COLLAPSED_W = 72;
const EXPANDED_W  = 256;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { branding } = useTenantBranding();
  const { theme, toggleTheme } = useTheme();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('sidebar-collapsed') === 'true'
      : false,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  interface Notification {
    id: string; title: string; message: string; is_read: boolean; created_at: string;
  }
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  const role = normalizeRole(user?.role);

  useEffect(() => {
    if (role !== 'Customer' && role !== 'Owner') return;
    const fetch = async () => {
      try {
        const ep   = role === 'Customer' ? '/api/customer/notifications' : '/api/notifications';
        const data = await apiGet<{ data: Notification[]; unread_count: number }>(ep);
        setNotifications(data.data);
        setUnreadCount(data.unread_count);
      } catch { /* silent */ }
    };
    void fetch();
    const iv = setInterval(() => void fetch(), 30000);
    return () => clearInterval(iv);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const markAllRead = async () => {
    try {
      const ep = role === 'Customer' ? '/api/customer/notifications/read-all' : '/api/notifications/read-all';
      await apiMutation(ep, 'PATCH');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markOneRead = async (id: string) => {
    try {
      const ep = role === 'Customer' ? `/api/customer/notifications/${id}/read` : `/api/notifications/${id}/read`;
      await apiMutation(ep, 'PATCH');
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(i => role ? (NAV_ACCESS[i.to] ?? []).includes(role) : false) }))
    .filter(g => g.items.length > 0);

  const allItems    = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(n =>
    n.end ? location.pathname === n.to : location.pathname === n.to || location.pathname.startsWith(n.to + '/'),
  )?.label ?? (location.pathname === '/dashboard' ? 'Dashboard' : '');

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  const brandingVars = branding?.primaryColor
    ? ({ '--primary': hexToHsl(branding.primaryColor), '--ring': hexToHsl(branding.primaryColor) } as React.CSSProperties)
    : undefined;

  const settingsPath = () => {
    if (role === 'Owner')    return '/dashboard/settings';
    if (role === 'Staff')    return '/dashboard/staff/settings';
    if (role === 'Mechanic') return '/dashboard/mechanic/settings';
    return '/dashboard/customer/settings';
  };

  /* ── Sidebar colour tokens ─────────────────────────────────────────── */
  const tooltipBg     = 'rgba(11, 70, 50, 0.9)';

  return (
    <div className="min-h-screen bg-background flex font-sans" style={brandingVars}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? COLLAPSED_W : EXPANDED_W }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className={`sticky top-4 h-[calc(100vh-32px)] ml-4 my-4 flex flex-col shrink-0 overflow-hidden transition-transform duration-300 z-50 rounded-[32px] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'rgba(11, 70, 50, 0.45)', // Dark green glass
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 0 20px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Logo area */}
        <div className={`flex items-center h-[90px] w-full shrink-0 relative ${isCollapsed ? 'justify-center' : 'px-5 justify-between'}`}>
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={branding?.logoUrl || '/images/logo.svg'}
              alt={branding?.shopName || 'MoSPAMS'}
              className="w-full h-full object-contain"
            />
          </button>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="ml-3 overflow-hidden min-w-0 flex-1"
              >
                <span className="text-[15px] font-bold text-white tracking-tight leading-none block whitespace-nowrap">
                  Mo<span className="text-white/40">SPAMS</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse / expand button — desktop only */}
          <div className={`hidden lg:block transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
            <button
              onClick={() => { setIsCollapsed(true); setSidebarOpen(false); }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {visibleGroups.map((group, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
              {/* Group separator */}
              {idx > 0 && (
                <div
                  className="mx-4 my-2 border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                />
              )}

              {/* Group label — expanded only */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-5 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.28)' }}
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
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className="block"
                      >
                        <div
                          className={`flex items-center transition-all duration-300 z-10 ${
                            isCollapsed 
                              ? 'justify-center w-12 h-12 mx-auto rounded-full' 
                              : `h-[52px] ${isActive ? 'w-full rounded-l-[24px] rounded-r-none pl-5 relative' : 'w-[calc(100%-12px)] rounded-full mr-3 px-4'}`
                          } ${
                            isActive 
                              ? 'bg-background text-foreground' 
                              : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
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
                                className="text-[15px] font-bold tracking-wide whitespace-nowrap ml-4"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Seamless Curve / Gooey Effect for Active Tab */}
                          {isActive && !isCollapsed && (
                            <>
                              {/* Top curve */}
                              <div className="absolute -top-[16px] right-0 w-[16px] h-[16px] text-background">
                                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 0V16H0C8.83656 16 16 8.83656 16 0Z" fill="currentColor" />
                                </svg>
                              </div>
                              {/* Bottom curve */}
                              <div className="absolute -bottom-[16px] right-0 w-[16px] h-[16px] text-background">
                                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 16V0H0C8.83656 0 16 7.16344 16 16Z" fill="currentColor" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>
                      </NavLink>

                      {/* Tooltip — collapsed state */}
                      {isCollapsed && (
                        <div
                          className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-white text-xs font-semibold opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-[100] shadow-xl"
                          style={{ background: tooltipBg }}
                        >
                          {item.label}
                          {/* Arrow */}
                          <span
                            className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
                            style={{ borderRightColor: tooltipBg }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — user profile shortcut */}
        <div className="shrink-0 p-3 mb-2">
          <button
            onClick={() => navigate(settingsPath())}
            className={`w-full flex items-center rounded-xl transition-colors hover:bg-white/10 ${
              isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-white/90 truncate leading-none">{user?.name}</p>
                  <p className="text-[11px] text-white/40 mt-0.5 leading-none">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Logout — visible only expanded */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                Sign Out
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 min-h-screen bg-background">

        {/* Top header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-4 px-6 h-[64px]">

            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-base font-semibold text-foreground tracking-tight">{currentLabel}</h1>

            <div className="ml-auto flex items-center gap-2">

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notification bell */}
              {(role === 'Customer' || role === 'Owner') && (
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    className="relative p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 w-[320px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">Notifications</p>
                            {unreadCount > 0 && (
                              <button onClick={() => void markAllRead()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-[320px] overflow-y-auto">
                            {notifications.length === 0 ? (
                              <p className="text-center text-muted-foreground text-xs py-8">No notifications yet</p>
                            ) : notifications.map(n => (
                              <button
                                key={n.id}
                                onClick={() => { if (!n.is_read) void markOneRead(n.id); }}
                                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors ${!n.is_read ? 'bg-secondary/20' : ''}`}
                              >
                                <div className="flex items-start gap-2">
                                  {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                                  <div className={!n.is_read ? '' : 'pl-3.5'}>
                                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="w-px h-6 bg-border" />

              {/* Profile dropdown */}
              <div className="relative">
                <motion.button
                  onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                  className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-secondary transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
                    <p className="text-xs text-muted-foreground leading-none mt-1">{user?.role}</p>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-[220px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          {role === 'Owner' && (
                            <>
                              <button onClick={() => { setProfileOpen(false); navigate('/dashboard/activity-logs'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                <ScrollText className="w-[18px] h-[18px]" strokeWidth={1.5} /> Activity Logs
                              </button>
                              <button onClick={() => { setProfileOpen(false); navigate('/dashboard/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} /> Settings
                              </button>
                            </>
                          )}
                          {role === 'Staff' && (
                            <button onClick={() => { setProfileOpen(false); navigate('/dashboard/staff/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} /> Settings
                            </button>
                          )}
                          {role === 'Mechanic' && (
                            <button onClick={() => { setProfileOpen(false); navigate('/dashboard/mechanic/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} /> Settings
                            </button>
                          )}
                          {role === 'Customer' && (
                            <button onClick={() => { setProfileOpen(false); navigate('/dashboard/customer/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} /> Settings
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => { setProfileOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors border-t border-border"
                        >
                          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} /> Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="min-h-[calc(100vh-64px)] bg-background p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
