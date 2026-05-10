import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: Array<{ date: string; amount: number }>;
  loading?: boolean;
}

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>('daily');

  const filteredData = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case 'daily':
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case 'monthly':
        cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
    }
    return data.filter(item => new Date(item.date) >= cutoff);
  }, [data, period]);

  const chartData = filteredData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: item.amount,
  }));

  const total = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const average = filteredData.length > 0 ? total / filteredData.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="relative bg-card dark:bg-gradient-to-br dark:from-zinc-900/90 dark:to-zinc-950/90 dark:backdrop-blur-xl shadow-soft dark:shadow-none border border-border/50 rounded-2xl p-6 overflow-hidden dark:hover:border-zinc-700/50 hover:border-zinc-300/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-1">Your Assets</h3>
            <p className="text-sm text-muted-foreground">Revenue trend</p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ChartPeriod)}
            className="h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 cursor-pointer"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-card-foreground">₱{total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
                <p className="text-2xl font-bold text-muted-foreground">₱{average.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            <div className="h-64 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                    labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                    itemStyle={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}
                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="rgb(var(--color-primary-rgb))"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}
