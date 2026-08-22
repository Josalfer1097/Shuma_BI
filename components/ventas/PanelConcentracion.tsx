'use client'

import { formatMonedaCorta, formatPct, type FilaRanking, type Dimension } from '@/lib/ventas'

type PanelConcentracionProps = {
  data: FilaRanking[]
  dimension: Dimension
}

export function PanelConcentracion({ data, dimension }: PanelConcentracionProps) {
  const EmptyState = () => (
    <section className="mb-8 flex min-h-[160px] items-center justify-center rounded-lg border border-border bg-bg-surface p-5">
      <p className="text-scale-sm text-text-muted">
        No hay datos suficientes de {dimension} con facturación para mostrar la concentración. Intenta cambiar de canal o periodo.
      </p>
    </section>
  )

  if (!data || data.length === 0) return <EmptyState />

  // Ordenar por importe facturado (regla 8)
  const sorted = data.slice().sort((a, b) => b.impFacturado - a.impFacturado)

  const totalFacturado = sorted.reduce((sum, r) => sum + r.impFacturado, 0)
  if (totalFacturado <= 0) return <EmptyState />

  const top1 = sorted.slice(0, 1)
  const top2to5 = sorted.slice(1, 5)
  const top6to20 = sorted.slice(5, 20)
  const elResto = sorted.slice(20)

  const sumTop1 = top1.reduce((sum, r) => sum + r.impFacturado, 0)
  const sumTop2to5 = top2to5.reduce((sum, r) => sum + r.impFacturado, 0)
  const sumTop6to20 = top6to20.reduce((sum, r) => sum + r.impFacturado, 0)
  const sumResto = elResto.reduce((sum, r) => sum + r.impFacturado, 0)

  const pctTop1 = (sumTop1 / totalFacturado) * 100
  const pctTop2to5 = (sumTop2to5 / totalFacturado) * 100
  const pctTop6to20 = (sumTop6to20 / totalFacturado) * 100
  const pctResto = (sumResto / totalFacturado) * 100

  return (
    <section className="mb-8 min-h-[160px] rounded-lg border border-border bg-bg-surface p-5">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-text-primary">Concentración de venta</h3>
          <p className="mt-1 text-scale-xs text-text-muted">
            Dependencia sobre los principales registros de {dimension}. Basado en importe facturado.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="h-4 w-full overflow-hidden rounded-full bg-bg-elevated flex">
          {pctTop1 > 0 && <div className="h-full transition-all duration-500 ease-out bg-accent" style={{ width: `${pctTop1}%` }} title={`Top 1: ${formatPct(pctTop1)}`} />}
          {pctTop2to5 > 0 && <div className="h-full transition-all duration-500 ease-out bg-accent-deep" style={{ width: `${pctTop2to5}%` }} title={`Top 2-5: ${formatPct(pctTop2to5)}`} />}
          {pctTop6to20 > 0 && <div className="h-full transition-all duration-500 ease-out bg-text-muted opacity-80" style={{ width: `${pctTop6to20}%` }} title={`Top 6-20: ${formatPct(pctTop6to20)}`} />}
          {pctResto > 0 && <div className="h-full transition-all duration-500 ease-out bg-bg-elevated brightness-90" style={{ width: `${pctResto}%` }} title={`Resto: ${formatPct(pctResto)}`} />}
        </div>
        
        <div className="flex justify-between items-center text-scale-xs mt-2">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> <span className="text-text-primary">Top 1</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent-deep" /> <span className="text-text-primary">Top 2–5</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-text-muted opacity-80" /> <span className="text-text-primary">Top 6–20</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-bg-elevated brightness-90 border border-border" /> <span className="text-text-primary">Resto</span></div>
          </div>
        </div>

        {top1.length > 0 && (
          <p className="mt-3 text-scale-sm text-text-secondary">
            <strong className="font-medium text-text-primary">{top1[0].nombre}</strong> representa el{' '}
            <strong className="font-medium text-text-primary tabular-nums">{formatPct(pctTop1)}</strong> del importe facturado total ({formatMonedaCorta(sumTop1)}).
            {dimension !== 'producto' && top1[0].cotizaciones !== null && ` Tiene ${top1[0].cotizaciones} cotizaciones.`}
          </p>
        )}
      </div>
    </section>
  )
}
