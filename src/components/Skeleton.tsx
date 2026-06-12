/** Placeholder com shimmer enquanto carrega dados. */
export function Skeleton({ w, h = 14, r = 6, className = '' }: { w?: number | string; h?: number; r?: number; className?: string }) {
  return <span className={`skel ${className}`} style={{ width: w, height: h, borderRadius: r }} aria-hidden />
}

/** Grade de 12 cards de grupo em estado de carregamento. */
export function GroupsSkeleton() {
  return (
    <div className="groups-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div className="gcard" key={i} style={{ padding: 14 }}>
          <Skeleton w="50%" h={18} />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} w="100%" h={16} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
