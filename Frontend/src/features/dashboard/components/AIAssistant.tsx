import { motion } from 'framer-motion';
import { Sparkles, Construction } from 'lucide-react';
import type { DashboardMetrics } from '@/shared/types/shop';

interface AIAssistantProps {
  metrics: DashboardMetrics | null;
}

export function AIAssistant({ metrics }: AIAssistantProps) {
  const generateInsights = () => {
    if (!metrics) return [];

    const insights: string[] = [];

    if (metrics.totalRevenue > 0) {
      const revenueGrowth = metrics.revenueByDay.length > 1
        ? ((metrics.revenueByDay[metrics.revenueByDay.length - 1].amount - metrics.revenueByDay[0].amount) / metrics.revenueByDay[0].amount * 100)
        : 0;

      if (revenueGrowth > 10) {
        insights.push(`Revenue is up ${revenueGrowth.toFixed(1)}% this period.`);
      } else if (revenueGrowth < -10) {
        insights.push(`Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% this period.`);
      }
    }

    if (metrics.serviceStatus.pending > 5) {
      insights.push(`${metrics.serviceStatus.pending} pending services need attention.`);
    }

    if (metrics.topServiceTypes.length > 0) {
      const top = metrics.topServiceTypes[0];
      insights.push(`"${top.name}" is your top service — ${top.count} jobs, ₱${top.revenue.toLocaleString()} revenue.`);
    }

    const totalPayments = metrics.paymentMethods.cash + metrics.paymentMethods.gcash;
    if (totalPayments > 0) {
      const gcashPct = (metrics.paymentMethods.gcash / totalPayments * 100).toFixed(0);
      insights.push(`${gcashPct}% of payments via GCash.`);
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/30">
              <Sparkles className="w-5 h-5 text-[rgb(var(--color-primary-rgb))]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Shop insights</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400 flex items-center gap-1.5">
            <Construction className="w-3 h-3" />
            In Development
          </span>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI-powered chat and predictive insights are coming soon. In the meantime, here's what the data says about your shop right now:
          </p>

          {insights.length === 0 ? (
            <div className="text-center py-6">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm text-muted-foreground">Not enough data to generate insights yet.</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className="p-3.5 bg-zinc-800/40 rounded-xl border border-zinc-700/50"
              >
                <p className="text-sm text-zinc-300">{insight}</p>
              </div>
            ))
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}
