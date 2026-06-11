// Skeleton loaders (no spinners, per the design spec). Shapes roughly match
// the components they stand in for so the layout doesn't jump on load.

export function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse-soft bg-val-panel2 ${className}`} />;
}

export function PlayerCardSkeleton() {
  return (
    <div className="panel clip-corner p-5 flex flex-col sm:flex-row gap-5">
      <div className="flex items-center gap-4 flex-1">
        <Block className="w-16 h-16" />
        <div className="space-y-2 flex-1">
          <Block className="h-6 w-48" />
          <Block className="h-4 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Block className="w-16 h-16" />
        <div className="space-y-2">
          <Block className="h-5 w-28" />
          <Block className="h-3 w-36" />
          <Block className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function StatsPanelSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Block key={i} className="h-24" />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <div className="animate-pulse-soft bg-val-panel2 w-full" style={{ height }} />;
}

export function FeedSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Block key={i} className="h-16" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Block key={i} className="h-12" />
      ))}
    </div>
  );
}
