// Skeleton loading components — server-safe, no "use client" needed

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-[#1a1a1a] ${className}`} style={style} />;
}

/** Tabla genérica de N filas × columnas */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1e1e1e] px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ opacity: 0.6 } as React.CSSProperties} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-[#1a1a1a] px-4 py-3 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`flex-1 ${c === 0 ? "h-4" : "h-3"}`}
              style={{ opacity: 0.4 - c * 0.05 } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Cards de KPI 2×2 o 4 en fila */
export function SkeletonKPIs({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-2 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2 w-full mt-1" />
        </div>
      ))}
    </div>
  );
}

/** Lista de cards (proyectos, técnicos, etc.) */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Page-level skeleton: header + tabla */
export function SkeletonPage({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {/* Search bar */}
      <Skeleton className="h-9 w-full rounded-lg" />
      {/* Table */}
      <SkeletonTable rows={rows} cols={cols} />
    </div>
  );
}
