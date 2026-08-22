'use client'

import { formatMonedaCorta, formatPct, type FilaRankingVista } from '@/lib/ventas'

type PanelEmbudoProps = {
  ranking: FilaRankingVista[] | null | undefined
}

export function PanelEmbudo({ ranking }: PanelEmbudoProps) {
  const EmptyState = () => (
    <section className="mb-8 flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-bg-surface p-5">
      <p className="text-scale-sm text-text-muted">
        No hay datos para el embudo. Intenta cambiar el filtro de canal o periodo.
      </p>
    </section>
  )

  if (!ranking || ranking.length === 0) return <EmptyState />

  const soloExterno = ranking.filter(
    (r) => r.dimension === 'cliente' && r.canal === 'externo',
  )

  if (soloExterno.length === 0) return <EmptyState />

  const totalCotizado = soloExterno.reduce((sum, r) => sum + r.imp_cotizado, 0)
  const totalFacturado = soloExterno.reduce((sum, r) => sum + r.imp_cot_convertido, 0)
  const totalSinSeguimiento = soloExterno.reduce((sum, r) => sum + r.imp_sin_seguimiento, 0)
  const totalVivo = soloExterno.reduce((sum, r) => sum + r.imp_en_proceso, 0)

  if (totalCotizado <= 0) return <EmptyState />

  const tramos = [
    { label: 'Cotizado', value: totalCotizado, color: 'bg-text-muted opacity-30' },
    { label: 'Facturado', value: totalFacturado, color: 'bg-accent' },
    { label: 'Sin seguimiento', value: totalSinSeguimiento, color: 'bg-danger' },
    { label: 'Vivo', value: totalVivo, color: 'bg-warning' },
  ]

  const totalTramos = totalFacturado + totalSinSeguimiento + totalVivo
  const tieneFaltante = totalCotizado - totalTramos > 1 // Para evitar problemas de redondeo float

  return (
    <section className="mb-8 min-h-[260px] rounded-lg border border-border bg-bg-surface p-5">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-text-primary">Embudo de conversión</h3>
          <p className="mt-1 text-scale-xs text-text-muted">
            Canal externo. La suma de facturado, sin seguimiento y vivo no totaliza el 100% del cotizado porque faltan los estados cancelado y suspendido.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {tramos.map((tramo) => {
          const pct = (tramo.value / totalCotizado) * 100
          return (
            <div key={tramo.label} className="flex flex-col gap-1 text-scale-sm">
              <div className="flex justify-between font-medium">
                <span className="text-text-primary">{tramo.label}</span>
                <span className="text-text-primary">
                  {formatMonedaCorta(tramo.value)}{' '}
                  <span className="text-text-muted font-normal w-12 inline-block text-right tabular-nums">
                    {formatPct(pct)}
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated relative">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${tramo.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      
      {tieneFaltante && (
        <p className="mt-4 text-scale-xs text-text-secondary text-right">
          *Nota: Existe un remanente de {formatMonedaCorta(totalCotizado - totalTramos)} en estados omitidos.
        </p>
      )}
    </section>
  )
}
