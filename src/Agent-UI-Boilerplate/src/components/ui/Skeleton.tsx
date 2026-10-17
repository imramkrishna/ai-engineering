import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800/60 ${className}`}
  />
);

export const StatCardSkeleton: React.FC = () => (
  <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-36" />
    <Skeleton className="h-3.5 w-48" />
  </div>
);

export const ListRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30">
    <div className="flex items-center gap-3.5 flex-1">
      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      <div className="space-y-2 flex-1 max-w-xs">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-7 w-20 rounded-full" />
  </div>
);
