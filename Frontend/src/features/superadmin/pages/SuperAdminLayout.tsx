import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Store,
  Terminal,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react';
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
    title: 'PLATFORM SETTINGS',
    items: [
      { to: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
      { to: '/superadmin/settings/maintenance', label: 'System Maintenance', icon: Wrench },
      { to: '/superadmin/settings/api', label: 'API Keys', icon: Terminal },
      { to: '/superadmin/settings/email', label: 'Email Templates', icon: Mail },
    ],
  },
  {
    title: 'AUDIT LOGS',
    items: [{ to: '/superadmin/audit-logs', label: 'Platform Activity History', icon: Activity }],
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

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-zinc-700 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col w-[260px] shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-[70px] border-b border-zinc-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center text-sm font-bold">
            SA
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight leading-none block">MoSPAMS</span>
            <span className="block text-[10px] text-zinc-400 font-semibold tracking-wider leading-none mt-1">PLATFORM</span>
          </div>
          <button className="ml-auto lg:hidden p-1.5 text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-bold text-zinc-500 tracking-wider mb-2 uppercase">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isExactMatch = location.pathname === item.to;
                  const isChildRoute = location.pathname.startsWith(item.to + '/') && item.to !== '/superadmin/shops' && item.to !== '/superadmin/settings';
                  const isActive = isExactMatch || isChildRoute || (item.to === '/superadmin/analytics' && location.pathname === '/superadmin');
                  
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={() =>
                        `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                          isActive
                            ? 'bg-zinc-800 text-white border-l-2 border-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`
                      }
                    >
                      <item.icon 
                        className={`w-[16px] h-[16px] transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} 
                        strokeWidth={1.75} 
                      />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-800 shrink-0">
           <button
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-[16px] h-[16px]" />
              <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="flex items-center gap-4 px-6 h-[70px] bg-black/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-30 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-2 rounded-lg hover:bg-zinc-900 text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Search shops, users, or transactions..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4 lg:gap-6">
            <button className="relative p-2 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white"></span>
            </button>
            
            <div className="w-px h-6 bg-zinc-800 hidden sm:block"></div>

            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="hidden sm:block text-right">
                <p className="text-[13px] font-semibold text-zinc-200 leading-none group-hover:text-white transition-colors">{user?.name}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider leading-none">SuperAdmin</p>
                </div>
              </div>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                     {/* Fallback avatar if no image */}
                     <UserAvatarInitials name={user?.name ?? 'S A'} />
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 hidden sm:block transition-colors" />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}

function UserAvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
    
  return <span className="text-[11px] font-bold text-white">{initials}</span>;
}
