import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Sparkles, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

export default function HeroSection() {
  const navigate = useNavigate();
  const { ref: heroRef, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.15 });

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="home" className="relative pt-32 pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-40 right-20 opacity-20">
        <Sparkles className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-40 left-20 opacity-20">
        <Sparkles className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <div ref={heroRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50 text-zinc-300 text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Multi-Tenant SaaS Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight mb-6"
          >
            Transform your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              motorcycle shop
            </span>
            <br />
            operations
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.16, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            All-in-one SaaS platform for inventory, service jobs, sales, reports, and team management.
            Multi-tenant by design - each shop gets its own branded subdomain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.24, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button
              onClick={() => navigate('/register-shop')}
              className="group px-8 py-4 rounded-2xl bg-[rgb(var(--color-primary-rgb))] text-white font-semibold text-base hover:opacity-90 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[rgb(var(--color-primary-rgb))]/20"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="px-8 py-4 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border/50 text-foreground font-semibold text-base hover:bg-zinc-800/50 transition-all duration-200"
            >
              View features
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.32, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground text-sm"
          >
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
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.22, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="relative bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/5 to-transparent pointer-events-none" />

            <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-zinc-700/50 flex items-center justify-center shadow-lg overflow-hidden">
                  <img src="/images/logo.svg" alt="MoSPAMS" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">MoSPAMS Dashboard</p>
                  <p className="text-xs text-muted-foreground">Real-time overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-green-400">Live</span>
              </div>
            </div>

            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Revenue" value="PHP 48.2K" trend="+12%" />
              <StatCard label="Active Jobs" value="14" trend="+3" />
              <StatCard label="Parts Stock" value="1,247" trend="-8" />
              <StatCard label="Completed" value="128" trend="+8" />
            </div>

            <div className="relative bg-zinc-800/30 rounded-2xl border border-zinc-700/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sales Performance</p>
                  <p className="text-2xl font-bold text-foreground">PHP 125,450</p>
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

            <div className="absolute -top-4 -right-4 bg-muted/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl px-4 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Growth</p>
                <p className="text-sm font-bold text-foreground">+24%</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  const isPositive = trend.startsWith('+');

  return (
    <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-4 hover:bg-zinc-800/40 transition-all">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p className="text-xl font-bold text-foreground mb-1">{value}</p>
      <p className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-muted-foreground'}`}>
        {trend}
      </p>
    </div>
  );
}
