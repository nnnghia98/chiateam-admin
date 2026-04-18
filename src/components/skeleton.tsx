import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-md',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card">
      <div className="flex justify-between items-center">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-10 rounded-badge" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex gap-2 ml-4">
          <Skeleton className="h-8 w-8 rounded-airbnb" />
          <Skeleton className="h-8 w-8 rounded-airbnb" />
        </div>
      </div>
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card">
      <div className="flex justify-between items-center">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2 ml-4">
          <Skeleton className="h-8 w-8 rounded-airbnb" />
          <Skeleton className="h-8 w-8 rounded-airbnb" />
        </div>
      </div>
    </div>
  );
}

export function LeaderboardCardSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-[#1c1c1e] rounded-card shadow-airbnb-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-8 rounded-airbnb flex-shrink-0" />
      </div>
    </div>
  );
}

export function PodiumSkeleton() {
  return (
    <div className="flex items-end justify-center gap-3 py-4">
      <Skeleton className="h-24 w-24 rounded-card" />
      <Skeleton className="h-32 w-28 rounded-card" />
      <Skeleton className="h-20 w-24 rounded-card" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
