import { motion } from 'framer-motion';
import { Sparkles, Send, Mic, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import type { DashboardMetrics } from '@/shared/types/shop';

interface AIAssistantProps {
  metrics: DashboardMetrics | null;
}

export function AIAssistant({ metrics }: AIAssistantProps) {
  const [input, setInput] = useState('');

  // Generate context-aware insights based on real data
  const generateInsights = () => {
    if (!metrics) return [];

    const insights: string[] = [];

    // Revenue insights
    if (metrics.totalRevenue > 0) {
      const revenueGrowth = metrics.revenueByDay.length > 1 
        ? ((metrics.revenueByDay[metrics.revenueByDay.length - 1].amount - metrics.revenueByDay[0].amount) / metrics.revenueByDay[0].amount * 100)
        : 0;
      
      if (revenueGrowth > 10) {
        insights.push(`Great news! Your revenue is up ${revenueGrowth.toFixed(1)}% this period. Keep up the momentum!`);
      } else if (revenueGrowth < -10) {
        insights.push(`Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% this period. Consider reviewing your pricing or marketing strategy.`);
      }
    }

    // Service insights
    if (metrics.serviceStatus.pending > 5) {
      insights.push(`You have ${metrics.serviceStatus.pending} pending services. Consider prioritizing these to improve customer satisfaction.`);
    }

    // Top service type insight
    if (metrics.topServiceTypes.length > 0) {
      const topService = metrics.topServiceTypes[0];
      insights.push(`"${topService.name}" is your top service with ${topService.count} bookings and ₱${topService.revenue.toLocaleString()} revenue.`);
    }

    // Payment method insight
    const totalPayments = metrics.paymentMethods.cash + metrics.paymentMethods.gcash;
    if (totalPayments > 0) {
      const gcashPercentage = (metrics.paymentMethods.gcash / totalPayments * 100).toFixed(0);
      insights.push(`${gcashPercentage}% of payments are via GCash. Digital payments are ${Number(gcashPercentage) > 50 ? 'dominating' : 'growing'}.`);
    }

    return insights.slice(0, 3); // Return top 3 insights
  };

  const insights = generateInsights();
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/30">
              <Sparkles className="w-5 h-5 text-[rgb(var(--color-primary-rgb))]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-zinc-500">Context-aware insights</p>
            </div>
          </div>
          
          <button className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">Loading insights...</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 flex items-center justify-center shrink-0 border border-[rgb(var(--color-primary-rgb))]/30">
                  <Sparkles className="w-4 h-4 text-[rgb(var(--color-primary-rgb))]" />
                </div>
                <div className="flex-1">
                  <div className="bg-zinc-800/50 rounded-2xl rounded-tl-sm p-4 border border-zinc-700/50">
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                      I need the full time breakdown for Project Nova from last week.
                    </p>
                    <p className="text-xs text-zinc-500">{currentTime}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 flex items-center justify-center shrink-0 border border-[rgb(var(--color-primary-rgb))]/30">
                  <Sparkles className="w-4 h-4 text-[rgb(var(--color-primary-rgb))]" />
                </div>
                <div className="flex-1">
                  <div className="bg-zinc-800/50 rounded-2xl rounded-tl-sm p-4 border border-zinc-700/50">
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                      Sure, I'm generating the detailed time analysis for Project Nova (Last week). You'll be able to download in CSV format.
                    </p>
                    {insights.map((insight, index) => (
                      <div key={index} className="mt-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
                        <p className="text-xs text-zinc-400">{insight}</p>
                      </div>
                    ))}
                    <p className="text-xs text-zinc-500 mt-3">{currentTime}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI Assistant anything..."
                className="w-full h-11 px-4 pr-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors">
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button className="h-11 w-11 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] flex items-center justify-center text-white hover:opacity-90 transition-opacity">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}
