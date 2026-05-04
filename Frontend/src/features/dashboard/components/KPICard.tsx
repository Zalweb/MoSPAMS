import { motion } from 'framer-motion';
import type { LucideProps } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
}

export function KPICard({ title, value, change, comparison, trend, icon: Icon, loading, delay = 0, sparklineData }: KPICardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      {/* Glassmorphism card */}
      <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/10 to-[rgb(var(--color-secondary-rgb))]/10 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/20">
              <Icon className="w-5 h-5 text-[rgb(var(--color-primary-rgb))]" strokeWidth={2} />
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
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">{title}</p>
            {loading ? (
              <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-bold text-white tracking-tight mb-1">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {comparison && (
                  <p className="text-xs text-zinc-500 mb-1">{comparison}</p>
                )}
                {trend && (
                  <p className="text-xs font-medium text-zinc-400">{trend}</p>
                )}
              </>
            )}
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && !loading && (
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {sparklineData.map((val, idx) => {
                const max = Math.max(...sparklineData);
                const height = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-[rgb(var(--color-primary-rgb))]/40 to-[rgb(var(--color-primary-rgb))]/20 rounded-sm transition-all duration-300 hover:from-[rgb(var(--color-primary-rgb))]/60 hover:to-[rgb(var(--color-primary-rgb))]/40"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </motion.div>
  );
}
