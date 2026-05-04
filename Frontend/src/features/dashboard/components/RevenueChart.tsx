import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: Array<{ date: string; amount: number }>;
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: item.amount,
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const average = data.length > 0 ? total / data.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Your Assets</h3>
            <p className="text-sm text-zinc-400">Revenue trend over time</p>
          </div>
          
          <div className="flex items-center gap-2">
            <select className="h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600">
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Daily</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-zinc-500">
            <p>No data available</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-white">₱{total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Daily Average</p>
                <p className="text-2xl font-bold text-zinc-400">₱{average.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Chart */}
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

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}
