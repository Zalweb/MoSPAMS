import { motion } from 'framer-motion';
import type { LucideProps } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type AccentColor = 'primary' | 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'cyan';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  comparison?: string;
  trend?: string;
  icon: React.ComponentType<LucideProps>;
  loading?: boolean;
  delay?: number;
  accentColor?: AccentColor;
  isHero?: boolean;
}

const ACCENT: Record<AccentColor, { icon: string; bg: string; glow: string }> = {
  primary: { icon: '', bg: 'from-[rgb(var(--color-primary-rgb))]/5', glow: 'bg-[rgb(var(--color-primary-rgb))]' },
  emerald: { icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', bg: 'from-emerald-500/5', glow: 'bg-emerald-500' },
  blue:    { icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400',    bg: 'from-blue-500/5',    glow: 'bg-blue-500'    },
  violet:  { icon: 'bg-violet-500/10 border-violet-500/20 text-violet-400', bg: 'from-violet-500/5', glow: 'bg-violet-500' },
  amber:   { icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400',  bg: 'from-amber-500/5',  glow: 'bg-amber-500'  },
  rose:    { icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400',    bg: 'from-rose-500/5',    glow: 'bg-rose-500'    },
  cyan:    { icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',    bg: 'from-cyan-500/5',    glow: 'bg-cyan-500'    },
};

export function KPICard({
  title, value, change, comparison, trend,
  icon: Icon, loading, delay = 0,
  accentColor = 'primary',
  isHero = false,
}: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isBrand = accentColor === 'primary';
  const accent = ACCENT[accentColor];

  const brandIconStyle: React.CSSProperties = {
    background: 'var(--brand-surface)',
    borderColor: 'var(--brand-border)',
    color: 'var(--brand-primary)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group h-full"
    >
      {isHero ? (
        /* ── Hero card: full brand gradient ── */
        <div
          className="relative flex flex-col h-full rounded-2xl p-6 overflow-hidden brand-card"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-white/20 border-white/20">
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              {change !== undefined && !loading && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isPositive ? 'bg-white/20 text-white border-white/30' : 'bg-black/20 text-white/80 border-white/10'
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-white/75 uppercase tracking-wide mb-2">{title}</p>
              {loading ? (
                <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-white tracking-tight mb-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                  {comparison && <p className="text-xs text-white/70 mb-1">{comparison}</p>}
                  {trend && <p className="text-xs font-medium text-white/70">{trend}</p>}
                </>
              )}
            </div>
            <div className="flex-1" />
          </div>
          {/* Shine sweep */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </div>
      ) : (
        /* ── Regular card: clean bg-card with brand/accent icon box ── */
        <div className={`relative flex flex-col h-full bg-card dark:bg-card/80 dark:backdrop-blur-xl shadow-soft dark:shadow-none border border-border/50 rounded-2xl p-6 overflow-hidden brand-card dark:hover:border-border dark:border-zinc-800/50 hover:border-zinc-300/50`}>
          {/* Hover overlay */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isBrand ? '' : `bg-gradient-to-br ${accent.bg} to-transparent`}`}
               style={isBrand ? { background: 'var(--brand-surface-gradient)' } : undefined} />

          {/* Glow top-right */}
          {!isBrand && (
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-10 ${accent.glow}`} />
          )}

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isBrand ? '' : accent.icon}`}
                style={isBrand ? brandIconStyle : undefined}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              {change !== undefined && !loading && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isPositive
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
              {loading ? (
                <div className="h-8 w-32 bg-secondary/50 dark:bg-zinc-800/50 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-card-foreground tracking-tight mb-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                  {comparison && <p className="text-xs text-muted-foreground mb-1">{comparison}</p>}
                  {trend && <p className="text-xs font-medium text-muted-foreground">{trend}</p>}
                </>
              )}
            </div>
            <div className="flex-1" />
          </div>

          {/* Shine sweep */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
