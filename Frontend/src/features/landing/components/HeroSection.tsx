import { useNavigate } from 'react-router';
import { Sparkles, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';

export default function HeroSection() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="home" className="relative pt-32 pb-24 overflow-hidden">
      {/* Decorative glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/10 rounded-full blur-3xl" />
      </div>

      {/* Floating sparkle decorations */}
      <div className="absolute top-40 right-20 opacity-20">
        <Sparkles className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-40 left-20 opacity-20">
        <Sparkles className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 text-zinc-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Web-Based Shop Management
          </div>

          {/* Hero Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Transform your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              motorcycle shop
            </span>
            <br />
            operations
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
            Complete management system for inventory, services, sales, and reports.
            Built for modern motorcycle repair shops and parts retailers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/register-shop')}
              className="group px-8 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="px-8 py-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 text-white font-semibold text-base hover:bg-zinc-800/50 transition-all duration-200"
            >
              View features
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" strokeWidth={2} />
              <span>Secure & reliable</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" strokeWidth={2} />
              <span>Real-time sync</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" strokeWidth={2} />
              <span>Analytics included</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview Card */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-8 overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/5 to-transparent pointer-events-none" />

            {/* Dashboard Header */}
            <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                  <span className="text-black text-sm font-bold">Mo</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">MoSPAMS Dashboard</p>
                  <p className="text-xs text-zinc-500">Real-time overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-green-400">Live</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Revenue" value="₱48.2K" trend="+12%" />
              <StatCard label="Active Jobs" value="14" trend="+3" />
              <StatCard label="Parts Stock" value="1,247" trend="-8" />
              <StatCard label="Completed" value="128" trend="+8" />
            </div>

            {/* Chart Preview */}
            <div className="relative bg-zinc-800/30 rounded-2xl border border-zinc-700/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Sales Performance</p>
                  <p className="text-2xl font-bold text-white">₱125,450</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold">
                  +18.2%
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {[45, 70, 55, 85, 60, 95, 75, 90, 65, 88, 70, 92, 78, 95, 82, 88].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-zinc-700/50 rounded-t-lg hover:bg-zinc-600 transition-colors cursor-pointer"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mt-3">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 shadow-xl px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Growth</p>
                <p className="text-sm font-bold text-white">+24%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-4 hover:bg-zinc-800/40 transition-all">
      <p className="text-xs text-zinc-500 mb-2">{label}</p>
      <p className="text-xl font-bold text-white mb-1">{value}</p>
      <p className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-zinc-400'}`}>
        {trend}
      </p>
    </div>
  );
}
