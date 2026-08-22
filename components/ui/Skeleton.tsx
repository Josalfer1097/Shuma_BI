/**
 * Esqueletos de carga.
 *
 * No hay spinners en el tablero, a proposito. Un spinner solo dice "algo
 * esta pasando"; un esqueleto con la forma exacta de lo que viene le dice
 * al ojo que esperar, y la pagina no salta cuando llega el dato real.
 *
 * Regla al usarlos: el esqueleto debe medir lo mismo que el contenido que
 * reemplaza. Si no coinciden las alturas, el salto al cargar molesta mas
 * que la espera.
 */

export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-bg-elevated ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

/** Una tarjeta de KPI. Misma altura que KpiCard con su pie. */
export function SkeletonKpi() {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-2.5 w-20" />
    </div>
  )
}

export function SkeletonKpiRow({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  )
}

export function SkeletonFiltros() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * La grafica.
 *
 * Las barras van a alturas distintas y fijas, no aleatorias: un
 * Math.random en el render haria que el esqueleto cambie de forma en cada
 * repintado, y eso se ve como un parpadeo.
 */
export function SkeletonGrafica({ alto = 320 }: { alto?: number }) {
  const alturas = [58, 74, 46, 82, 64, 90, 52, 70, 60, 78, 44, 68]
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6">
      <Skeleton className="h-4 w-56" />
      <div
        className="mt-6 flex items-end gap-3"
        style={{ height: alto - 80 }}
      >
        {alturas.map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface">
      <div className="flex items-center justify-between p-5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="border-t border-border">
        {Array.from({ length: filas }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
