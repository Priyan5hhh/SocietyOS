import { cn } from "@/lib/utils"

/** Base shimmer block — compose into page-shaped skeletons below. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} />
}

/** Matches the shape of a Table inside a Card — used for every list/table loading state. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-2/5" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Matches the StatTile grid + two-card layout on the dashboard home. */
export function DashboardSkeleton() {
  return (
    <div className="p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-ink-100 bg-paper-0 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-paper-0 p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <TableSkeleton rows={3} cols={2} />
        </div>
        <div className="rounded-xl border border-ink-100 bg-paper-0 p-5">
          <Skeleton className="h-4 w-24" />
          <TableSkeleton rows={3} cols={1} />
        </div>
      </div>
    </div>
  )
}
