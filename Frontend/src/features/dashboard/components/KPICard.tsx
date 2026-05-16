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
  sparklineData?: number[];
  accentColor?: AccentColor;
}

const ACCENT: Record<AccentColor, { icon: string; badge: string; bg: string; bar: string; glow: string }> = {
  primary: {
    icon: 'bg-[rgb(var(--color-primary-rgb))]/10 border-[rgb(var(--color-primary-rgb))]/20 text-[rgb(var(--color-primary-rgb))]',
    badge: '',
    bg: 'from-[rgb(var(--color-primary-rgb))]/5',
    bar: 'bg-[rgb(var(--color-primary-rgb))]',
    glow: 'bg-[rgb(var(--color-primary-rgb))]',
  },
  emerald: {
    icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    badge: '',
    bg: 'from-emerald-500/5',
    bar: 'bg-emerald-500',
    glow: 'bg-emerald-500',
  },
  blue: {
    icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    badge: '',
    bg: 'from-blue-500/5',
    bar: 'bg-blue-500',
    glow: 'bg-blue-500',
  },
  violet: {
    icon: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    badge: '',
    bg: 'from-violet-500/5',
    bar: 'bg-violet-500',
    glow: 'bg-violet-500',
  },
  amber: {
    icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    badge: '',
    bg: 'from-amber-500/5',
    bar: 'bg-amber-500',
    glow: 'bg-amber-500',
  },
  rose: {
    icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    badge: '',
    bg: 'from-rose-500/5',
    bar: 'bg-rose-500',
    glow: 'bg-rose-500',
  },
  cyan: {
    icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    badge: '',
    bg: 'from-cyan-500/5',
    bar: 'bg-cyan-500',
    glow: 'bg-cyan-500',
  },
};

export function KPICard({
  title, value, change, comparison, trend,
  icon: Icon, loading, delay = 0, sparklineData,
  accentColor = 'primary',
}: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;
  const accent = ACCENT[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group h-full"
    >
      <div className="relative flex flex-col h-full bg-card dark:bg-card/80 dark:backdrop-blur-xl shadow-soft dark:shadow-none border border-border/50 rounded-2xl p-6 overflow-hidden dark:hover:border-border dark:border-zinc-800/50 hover:border-zinc-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

        {/* Glow top-right */}
        <div className={`absolute top-0 right-0 w-20 h-20 ${accent.glow}/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-60`} />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${accent.icon}`}>
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
          {sparklineData && sparklineData.length > 0 && !loading && (
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {sparklineData.map((val, idx) => {
                const max = Math.max(...sparklineData);
                const height = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className={`flex-1 ${accent.bar} opacity-40 rounded-sm transition-all duration-300 hover:opacity-70`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Shine sweep */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </motion.div>
  );
}
