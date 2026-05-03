const QUICK_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Roles', href: '#roles' },
  { label: 'Reports', href: '#reports' },
  { label: 'Contact', href: '#contact' },
];

const SYSTEM_LINKS = [
  { label: 'Inventory', href: '#features' },
  { label: 'Services', href: '#features' },
  { label: 'Sales', href: '#features' },
  { label: 'Reports', href: '#reports' },
];

export default function LandingFooter() {
  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer className="bg-black text-white border-t border-zinc-900">
      {/* Top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md">
                <span className="text-black text-xs font-bold">Mo</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                Mo<span className="text-zinc-400">SPAMS</span>
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">
              Motorcycle Service and Parts Management System for repair shops and parts retailers.
              Manage everything in one connected web-based platform.
            </p>
            {/* System info pills */}
            <div className="flex flex-wrap gap-2">
              {['Laravel', 'React + TypeScript', 'MySQL', 'Vite'].map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* System Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">System</h4>
            <ul className="space-y-2.5">
              {SYSTEM_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            © 2026 <span className="text-white font-semibold">MoSPAMS</span>. All rights
            reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
