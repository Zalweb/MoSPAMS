import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import HeroLoginCard from './HeroLoginCard';

interface HeroSectionProps {
  showLogin: boolean;
  onBackClick: () => void;
}

export default function HeroSection({ showLogin, onBackClick }: HeroSectionProps) {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="home" className="relative pt-24 pb-20 overflow-clip bg-black">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-900/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text Content */}
          <div className="relative flex flex-col justify-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Web-Based Shop Management System
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              Elegance in every{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                motorcycle shop
              </span>
              <br className="hidden sm:block" />
              operation.
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed mb-8 max-w-lg">
              MoSPAMS helps motorcycle repair shops and parts retailers manage{' '}
              <strong className="text-zinc-200 font-medium">inventory</strong>,{' '}
              <strong className="text-zinc-200 font-medium">service jobs</strong>,{' '}
              <strong className="text-zinc-200 font-medium">sales</strong>, reports, and staff
              operations in one connected web-based system.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <button
                id="hero-get-started-btn"
                onClick={() => navigate('/register-shop')}
                className="px-7 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all duration-200"
              >
                Get Started
              </button>
              <button
                id="hero-learn-more-btn"
                onClick={() => scrollTo('features')}
                className="px-7 py-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-white font-semibold text-sm hover:bg-zinc-800 transition-all duration-200"
              >
                Learn More
              </button>
            </div>

          </div>

          {/* Right: Dashboard Preview / Login */}
          <div id="hero-right-container" className="hero-right relative flex justify-center lg:justify-end items-center min-h-[620px]">
            <AnimatePresence mode="wait">
              {!showLogin ? (
                <motion.div
                  key="hero-preview"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="w-full relative"
                >
                  <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl p-5 overflow-hidden">
              {/* Dashboard Header Bar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
                    <span className="text-black text-[8px] font-bold">Mo</span>
                  </div>
                  <span className="text-xs font-semibold text-white">MoSPAMS Dashboard</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-zinc-500">Live</span>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard label="Total Sales" value="₱48,250" change="+12%" color="violet" icon="💰" />
                <StatCard label="Active Jobs" value="14" change="+3" color="purple" icon="🔧" />
                <StatCard label="Low Stock" value="7" change="Alert" color="violet" icon="⚠️" />
                <StatCard label="Completed" value="128" change="+8 today" color="green" icon="✅" />
              </div>

              {/* Recent Activity List */}
              <div className="bg-zinc-900 rounded-xl p-3 mb-3 border border-zinc-800">
                <p className="text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">Recent Transactions</p>
                <div className="space-y-2">
                  {[
                    { name: 'Oil Change + Parts', amount: '₱850', status: 'Completed', color: 'green' },
                    { name: 'Brake Repair Service', amount: '₱1,200', status: 'Ongoing', color: 'purple' },
                    { name: 'Parts Sale - Filter', amount: '₱350', status: 'Paid', color: 'violet' },
                  ].map((tx) => (
                    <div key={tx.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        <p className="text-[11px] font-medium text-zinc-300">{tx.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-white">{tx.amount}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          tx.color === 'green' ? 'bg-green-500/10 text-green-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini chart bar */}
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Inventory Overview</p>
                  <span className="text-[10px] text-zinc-400 font-medium">View All</span>
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-zinc-700 rounded-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute -top-4 -right-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">🏍️</span>
              <div>
                <p className="text-[10px] text-zinc-400 leading-none">Shop Status</p>
                <p className="text-xs font-bold text-white">Fully Operational</p>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 bg-zinc-900 rounded-full border border-zinc-800 shadow-lg px-3 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-3 h-3 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-zinc-300">Real-time sync</span>
            </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-login"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="w-full flex justify-center lg:justify-end"
                >
                  <HeroLoginCard onBack={onBackClick} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  change,
  color,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  color: 'violet' | 'purple' | 'green';
  icon: string;
}) {
  const colorMap = {
    violet: 'bg-zinc-900 text-white border-zinc-800',
    purple: 'bg-zinc-900 text-white border-zinc-800',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  const changeColorMap = {
    violet: 'text-zinc-400',
    purple: 'text-zinc-400',
    green: 'text-green-500',
  };
  return (
    <div className={`rounded-xl border p-2.5 flex flex-col justify-between ${colorMap[color]}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-medium opacity-80">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className={`text-[9px] font-semibold ${changeColorMap[color]}`}>{change}</p>
      </div>
    </div>
  );
}
