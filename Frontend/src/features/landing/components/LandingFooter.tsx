import { motion } from 'framer-motion';
import { Bike, Globe, Heart, LayoutDashboard, Package, Receipt, Server, Wrench } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const QUICK_LINKS = [
  { label: 'Home', href: '#home', icon: Heart },
  { label: 'Features', href: '#features', icon: Wrench },
  { label: 'About', href: '#about', icon: Globe },
  { label: 'Roles', href: '#roles', icon: LayoutDashboard },
  { label: 'Reports', href: '#reports', icon: Package },
  { label: 'Contact', href: '#contact', icon: Receipt },
];

const SYSTEM_LINKS = [
  { label: 'Inventory', href: '#features' },
  { label: 'Services', href: '#features' },
  { label: 'Sales', href: '#features' },
  { label: 'Reports', href: '#reports' },
];

const TECH_BADGES = [
  { label: 'Laravel', icon: Server },
  { label: 'React + TypeScript', icon: LayoutDashboard },
  { label: 'MySQL', icon: Database },
  { label: 'Vite', icon: Globe },
];

function Database({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export default function LandingFooter() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.1 });

  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer ref={ref} className="bg-black text-white border-t border-zinc-900">
      {/* Top border with gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10"
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
        >
          {/* Brand Column */}
          <motion.div
            className="lg:col-span-2"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <motion.div
              className="flex items-center gap-2 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md"
                whileHover={{ rotate: 10 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Bike className="w-4 h-4 text-black" />
              </motion.div>
              <span className="text-xl font-bold tracking-tight">
                Mo<span className="text-zinc-400">SPAMS</span>
              </span>
            </motion.div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">
              Motorcycle Service and Parts Management System for repair shops and parts retailers.
              Manage everything in one connected web-based platform.
            </p>
            {/* Tech badges */}
            <div className="flex flex-wrap gap-2">
              {TECH_BADGES.map((tech) => {
                const Icon = tech.icon;
                return (
                  <motion.span
                    key={tech.label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium"
                    whileHover={{ scale: 1.05, borderColor: 'rgb(63 63 70)' }}
                  >
                    <Icon className="w-3 h-3" />
                    {tech.label}
                  </motion.span>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <motion.button
                      onClick={() => scrollTo(link.href)}
                      className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
                      whileHover={{ x: 4 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.label}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* System Links */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <h4 className="text-sm font-semibold text-white mb-4">System</h4>
            <ul className="space-y-2.5">
              {SYSTEM_LINKS.map((link) => (
                <li key={link.label}>
                  <motion.button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                    whileHover={{ x: 4 }}
                  >
                    {link.label}
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          className="mt-12 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-zinc-500">
            © 2026 <span className="text-white font-semibold">MoSPAMS</span>. All rights
            reserved.
          </p>
          <motion.div
            className="flex items-center gap-1.5 text-xs text-zinc-500"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            System Operational
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}