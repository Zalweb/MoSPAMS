import { TrendingUp, BarChart3, DollarSign, Calendar } from 'lucide-react';

export default function RevenueReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Revenue Reports</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Detailed revenue analytics and reports</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Revenue Reports Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Advanced revenue analytics with charts, breakdowns, and export functionality will be available here.
        </p>
      </div>
    </div>
  );
}

export function OverdueAccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Overdue Accounts</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shops with overdue payments</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Overdue Tracking Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Track overdue payments, send reminders, and manage payment collections.
        </p>
      </div>
    </div>
  );
}

export function RevenueAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Revenue Analytics</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Deep dive into revenue metrics and trends</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Comprehensive revenue analytics with forecasting and trend analysis.
        </p>
      </div>
    </div>
  );
}

export function ShopGrowthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Shop Growth Trends</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Track shop registration and growth over time</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Growth Analytics Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Visualize shop registration trends, growth rates, and projections.
        </p>
      </div>
    </div>
  );
}

export function UserStatisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">User Statistics</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Platform-wide user metrics and activity</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">User Analytics Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Track user counts, activity levels, and engagement across all shops.
        </p>
      </div>
    </div>
  );
}
