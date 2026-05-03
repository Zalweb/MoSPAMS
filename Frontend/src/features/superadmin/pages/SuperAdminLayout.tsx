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
      { to: '/superadmin/settings', label: 'Subscription Plans Config', icon: Settings },
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
    <div className="min-h-screen bg-[#0A0A0A] text-slate-300 font-sans selection:bg-teal-500/30 flex">
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
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#111111] border-r border-white/5 flex flex-col w-[260px] shrink-0 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-[70px] border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-sm font-bold shadow-[0_0_15px_rgba(20,184,166,0.2)]">
            SA
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight leading-none block">MoSPAMS</span>
            <span className="block text-[10px] text-teal-500 font-semibold tracking-wider leading-none mt-1">PLATFORM</span>
          </div>
          <button className="ml-auto lg:hidden p-1.5 text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                        isActive || (item.to === '/superadmin/analytics' && location.pathname === '/superadmin')
                          ? 'bg-teal-500/10 text-teal-400 shadow-[inset_2px_0_0_0_rgba(20,184,166,1)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon 
                      className={`w-[16px] h-[16px] transition-colors ${location.pathname.startsWith(item.to) || (item.to === '/superadmin/analytics' && location.pathname === '/superadmin') ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} 
                      strokeWidth={1.75} 
                    />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5 shrink-0">
           <button
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-[16px] h-[16px]" />
              <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="flex items-center gap-4 px-6 h-[70px] bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-2 rounded-lg hover:bg-white/5 text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search shops, users, or transactions..." 
                className="w-full bg-[#111111] border border-white/10 rounded-full pl-9 pr-4 py-2 text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4 lg:gap-6">
            <button className="relative p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
            </button>
            
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>

            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="hidden sm:block text-right">
                <p className="text-[13px] font-semibold text-slate-200 leading-none group-hover:text-white transition-colors">{user?.name}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]"></span>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-none">SuperAdmin</p>
                </div>
              </div>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#111111] flex items-center justify-center overflow-hidden border border-black">
                     {/* Fallback avatar if no image */}
                     <UserAvatarInitials name={user?.name ?? 'S A'} />
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 hidden sm:block transition-colors" />
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
          background: rgba(255, 255, 255, 0.2);
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
