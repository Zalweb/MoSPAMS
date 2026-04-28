import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { View } from '@/shared/types';

const navItems: { label: string; view: View; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { label: 'Dashboard', view: 'overview', icon: LayoutDashboard },
  { label: 'Inventory', view: 'inventory', icon: Package },
  { label: 'Services', view: 'services', icon: Wrench },
  { label: 'Sales', view: 'sales', icon: ShoppingCart },
  { label: 'Reports', view: 'reports', icon: BarChart3 },
  { label: 'Users', view: 'users', icon: Shield, adminOnly: true },
];

export default function DashboardLayout({ children, currentView, onNavigate }: { children: ReactNode; currentView: View; onNavigate: (v: View) => void }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === 'Admin';

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex font-sans">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 z-40 lg:hidden backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-[#F0EFED] flex flex-col w-[220px] shrink-0 transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-[60px] border-b border-[#F0EFED]">
          <div className="w-7 h-7 rounded-[9px] bg-[#1C1917] flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[13px] font-bold text-[#1C1917] tracking-tight leading-none">MoSPAMS</span>
            <span className="block text-[9px] text-[#D6D3D1] font-medium leading-none mt-0.5">MANAGEMENT</span>
          </div>
          <button className="ml-auto lg:hidden p-1 text-[#D6D3D1] hover:text-[#78716C]" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.filter(item => !item.adminOnly || isAdmin).map(item => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#1C1917] text-white shadow-sm'
                    : 'text-[#A8A29E] hover:text-[#44403C] hover:bg-[#F5F5F4]'
                }`}
              >
                <item.icon className="w-[15px] h-[15px]" strokeWidth={active ? 2 : 1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-[#F0EFED]">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[11px] font-bold text-[#78716C]">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#44403C] truncate">{user?.name}</p>
              <p className="text-[10px] text-[#D6D3D1] font-medium">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium text-[#D6D3D1] hover:text-[#EF4444] hover:bg-red-50/50 transition-all"
          >
            <LogOut className="w-[15px] h-[15px]" strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 min-h-screen">
        {/* Mobile Topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-[52px] bg-white border-b border-[#F0EFED] sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E]">
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[14px] font-semibold text-[#1C1917] tracking-tight">
            {navItems.find(n => n.view === currentView)?.label}
          </span>
        </div>

        <div className="p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
