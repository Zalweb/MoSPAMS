import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X, ClipboardCheck,
  Home, Calendar, CreditCard, ScrollText, Settings, Bike, Bell, Users, Sun, Moon,
  ChevronLeft, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTenantBranding, hexToHsl } from '@/shared/contexts/TenantBrandingContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { NAV_ACCESS } from '@/shared/lib/permissions';
import { normalizeRole } from '@/shared/lib/roles';
import { apiGet, apiMutation } from '@/shared/lib/api';

const navGroups = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
    ]
  },
  {
    title: 'INVENTORY & SERVICES',
    items: [
      { label: 'Inventory', to: '/dashboard/inventory', icon: Package },
      { label: 'Service Jobs', to: '/dashboard/services', icon: Wrench },
      { label: 'Sales', to: '/dashboard/sales', icon: ShoppingCart },
    ]
  },
  {
    title: 'REPORTS & USERS',
    items: [
      { label: 'Reports', to: '/dashboard/reports', icon: BarChart3 },
      { label: 'Users', to: '/dashboard/users', icon: Shield },
      { label: 'Customers', to: '/dashboard/customers', icon: Users },
      { label: 'Mechanics', to: '/dashboard/mechanics', icon: Wrench },
      { label: 'Approvals', to: '/dashboard/approvals', icon: ClipboardCheck },
    ]
  },
  {
    title: 'CUSTOMER AREA',
    items: [
      { label: 'Home', to: '/dashboard/customer', icon: Home, end: true },
      { label: 'Book Service', to: '/dashboard/customer/book', icon: Calendar },
      { label: 'History', to: '/dashboard/customer/history', icon: Wrench },
      { label: 'Payments', to: '/dashboard/customer/payments', icon: CreditCard },
      { label: 'Parts', to: '/dashboard/customer/parts', icon: Package },
      { label: 'My Garage', to: '/dashboard/customer/vehicles', icon: Bike },
    ]
  },
  {
    title: 'WORK',
    items: [
      { label: 'Assigned Jobs', to: '/dashboard/mechanic/jobs', icon: Wrench },
      { label: 'Job History', to: '/dashboard/mechanic/history', icon: CheckCircle2 },
      { label: 'Performance', to: '/dashboard/mechanic/performance', icon: BarChart3 },
    ]
  }
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { branding } = useTenantBranding();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = normalizeRole(user?.role);

  useEffect(() => {
    if (role !== 'Customer' && role !== 'Owner') return;
    const fetchNotifs = async () => {
      try {
        const endpoint = role === 'Customer' ? '/api/customer/notifications' : '/api/notifications';
        const data = await apiGet<{ data: Notification[]; unread_count: number }>(endpoint);
        setNotifications(data.data);
        setUnreadCount(data.unread_count);
      } catch { /* silent */ }
    };
    void fetchNotifs();
    const interval = setInterval(() => void fetchNotifs(), 30000);
    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const markAllRead = async () => {
    try {
      const endpoint = role === 'Customer' ? '/api/customer/notifications/read-all' : '/api/notifications/read-all';
      await apiMutation(endpoint, 'PATCH');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markOneRead = async (id: string) => {
    try {
      const endpoint = role === 'Customer' ? `/api/customer/notifications/${id}/read` : `/api/notifications/${id}/read`;
      await apiMutation(endpoint, 'PATCH');
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => role ? (NAV_ACCESS[item.to] ?? []).includes(role) : false)
  })).filter(group => group.items.length > 0);

  const allNavItems = navGroups.flatMap(g => g.items);
  const currentLabel = allNavItems.find(n => n.end ? location.pathname === n.to : location.pathname === n.to || location.pathname.startsWith(n.to + '/'))?.label
    ?? (location.pathname === '/dashboard' ? 'Dashboard' : '');

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  const brandingVars = branding?.primaryColor
    ? ({
        '--primary': hexToHsl(branding.primaryColor),
        '--ring': hexToHsl(branding.primaryColor),
        '--primary-foreground': '0 0% 100%',
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen bg-background flex font-sans" style={brandingVars}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-sidebar border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-border shrink-0 h-[70px] transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-6'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={branding?.primaryColor && branding?.secondaryColor ? {
                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              } : { background: 'rgb(var(--color-primary-rgb))' }}
            >
              <img
                src={branding?.logoUrl || '/images/logo.svg'}
                alt={branding?.shopName || 'MoSPAMS'}
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap"
              >
                <span className="text-[15px] font-bold text-foreground tracking-tight leading-none block">
                  Mo<span className="text-muted-foreground">SPAMS</span>
                </span>
                <span className="block text-[10px] text-muted-foreground font-semibold tracking-wider leading-none mt-1">
                  {(branding?.shopName || user?.shopName || 'Management').toUpperCase()}
                </span>
              </motion.div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              className="ml-auto lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary dark:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-border hover:bg-muted-foreground/20 text-muted-foreground absolute -right-3 top-[23px] z-[60] border border-border shadow-sm transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 space-y-6 overflow-y-auto custom-scrollbar transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-4'}`}>
          {visibleGroups.map((group, idx) => (
            <div key={idx} className="relative">
              {!isCollapsed ? (
                <motion.h3 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 text-[10px] font-bold text-muted-foreground tracking-wider mb-2 uppercase whitespace-nowrap overflow-hidden"
                >
                  {group.title}
                </motion.h3>
              ) : (
                <div className="h-4" />
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                  
                  const mixedColor = branding?.primaryColor && branding?.secondaryColor
                    ? (() => {
                        const hex = (h: string) => { h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
                        const [pr,pg,pb] = hex(branding.primaryColor);
                        const [sr,sg,sb] = hex(branding.secondaryColor);
                        const r = Math.round((pr+sr)/2).toString(16).padStart(2,'0');
                        const g = Math.round((pg+sg)/2).toString(16).padStart(2,'0');
                        const b = Math.round((pb+sb)/2).toString(16).padStart(2,'0');
                        return `#${r}${g}${b}`;
                      })()
                    : branding?.primaryColor;

                  const activeStyle = isActive && branding?.primaryColor ? {
                    background: theme === 'dark'
                      ? `linear-gradient(135deg, ${branding.primaryColor}25, ${branding.secondaryColor || branding.primaryColor}25)`
                      : `linear-gradient(135deg, ${branding.primaryColor}18, ${branding.secondaryColor || branding.primaryColor}18)`,
                    color: mixedColor,
                    borderLeftColor: mixedColor,
                  } : undefined;

                  return (
                    <div key={item.to} className="relative group/item">
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        style={activeStyle}
                        className={`w-full flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                          isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'
                        } ${
                          isActive
                            ? 'bg-accent dark:bg-secondary dark:bg-zinc-800 text-accent-foreground dark:text-foreground border-l-2 border-primary dark:border-white'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50'
                        }`}
                      >
                        <item.icon 
                          className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? (branding?.primaryColor ? '' : 'text-accent-foreground dark:text-foreground') : 'text-muted-foreground group-hover:text-foreground'}`} 
                          strokeWidth={1.75} 
                          style={isActive && mixedColor ? { color: mixedColor } : undefined}
                        />
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </NavLink>

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-md opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100] shadow-xl">
                          {item.label}
                          <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rotate-45" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-4 px-6 h-[64px]">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <h1 className="text-base font-semibold text-foreground tracking-tight">{currentLabel}</h1>

            {/* Right side actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors mr-1"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notification Bell — customers only */}
              {role === 'Customer' || role === 'Owner' ? (
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                    className="relative p-2 rounded-xl hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
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
                        className="absolute right-0 top-full mt-2 w-[320px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl shadow-black/50 z-50 overflow-hidden"
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
                          ) : (
                            notifications.map(n => (
                              <button
                                key={n.id}
                                onClick={() => { if (!n.is_read) void markOneRead(n.id); }}
                                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary dark:bg-zinc-800/30 transition-colors ${!n.is_read ? 'bg-secondary dark:bg-zinc-800/20' : ''}`}
                              >
                                <div className="flex items-start gap-2">
                                  {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                                  <div className={!n.is_read ? '' : 'pl-3.5'}>
                                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground dark:text-zinc-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                  </AnimatePresence>
                </div>
              ) : null}

              {/* Divider */}
              <div className="w-px h-6 bg-secondary dark:bg-zinc-800" />

              {/* Profile */}
              <div className="relative">
                <motion.button
                  onClick={() => { setProfileOpen(o => !o); }}
                  className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-secondary dark:bg-zinc-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
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
                      className="absolute right-0 top-full mt-2 w-[220px] bg-muted/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl shadow-black/50 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        {role === 'Owner' && (
                          <>
                            <button
                              onClick={() => { setProfileOpen(false); navigate('/dashboard/activity-logs'); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 transition-colors"
                            >
                              <ScrollText className="w-[18px] h-[18px]" strokeWidth={1.5} />
                              Activity Logs
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); navigate('/dashboard/settings'); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 transition-colors"
                            >
                              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
                              Settings
                            </button>
                          </>
              )}
                        {role === 'Customer' && (
                          <button
                            onClick={() => { setProfileOpen(false); navigate('/dashboard/customer/settings'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 transition-colors"
                          >
                            <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            Profile Settings
                          </button>
              )}
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors border-t border-border"
                      >
                        <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        Sign Out
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

