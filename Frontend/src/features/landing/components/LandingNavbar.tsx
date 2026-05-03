import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Roles', href: '#roles' },
  { label: 'Reports', href: '#reports' },
  { label: 'Contact', href: '#contact' },
];

interface LandingNavbarProps {
  onSignInClick: () => void;
}

export default function LandingNavbar({ onSignInClick }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);

      const sections = NAV_LINKS.map((l) => l.href.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMenuOpen(false);
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(0,0,0,0.75)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
          : 'bg-transparent border-b border-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            onClick={() => scrollTo('#home')}
            className="flex items-center gap-2 group"
            id="nav-logo-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md"
              whileHover={{ rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Bike className="w-4 h-4 text-black" />
            </motion.div>
            <span className="text-lg font-bold text-white tracking-tight">
              Mo<span className="text-zinc-400">SPAMS</span>
            </span>
          </motion.button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link, index) => {
              const isActive = activeSection === link.href.replace('#', '');
              return (
                <motion.button
                  key={link.href}
                  id={`nav-link-${link.label.toLowerCase()}`}
                  onClick={() => scrollTo(link.href)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-zinc-800'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {link.label}
                </motion.button>
              );
            })}
          </div>

          {/* Actions: Sign In & Hamburger */}
          <div className="flex items-center gap-3">
            <motion.button
              id="nav-signin-btn"
              onClick={onSignInClick}
              className="px-5 py-2 md:px-6 md:py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs md:text-sm font-semibold transition-all duration-200"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.button>

            {/* Mobile Hamburger */}
            <motion.button
              id="nav-hamburger-btn"
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Toggle menu"
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden bg-zinc-950 border-b border-zinc-800"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link, index) => (
                <motion.button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {link.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}