import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-zinc-800/60',
        className,
      )}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-800/60 h-4',
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonText className="w-1/2" />
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonText className="w-3/4" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50">
      <SkeletonBlock className="h-4 w-4 rounded" />
      <SkeletonText className="flex-1" />
      <SkeletonText className="w-24" />
      <SkeletonText className="w-20" />
      <SkeletonText className="w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex gap-4">
        <SkeletonText className="w-32" />
        <SkeletonText className="w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}
