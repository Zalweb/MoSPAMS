import { SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonText } from '@/shared/components/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonText className="w-64" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Chart + Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-1">
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
      </div>

      {/* Table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
