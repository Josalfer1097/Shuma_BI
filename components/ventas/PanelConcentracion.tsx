'use client'

import { formatMonedaCorta, formatPct, type FilaRanking, type Dimension } from '@/lib/ventas'
import { Tooltip } from '../ui/Tooltip'
import { TooltipDato } from '../ui/TooltipDato'

type PanelConcentracionProps = {
  data: FilaRanking[]
  dimension: Dimension
  /** Importe facturado de las cuentas de mostrador excluidas del calculo. */
  mostradorFacturado?: number
  /** Cuantas cuentas de mostrador se excluyeron. */
  mostradorCuentas?: number
}

export function PanelConcentracion({
  data,
  dimension,
  mostradorFacturado = 0,
  mostradorCuentas = 0,
}: PanelConcentracionProps) {
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
          <h3 className="flex items-center gap-2 font-medium text-text-primary">
            Concentración de venta
            <Tooltip text="Mide la dependencia sobre los principales registros de la dimensión activa. Se ordena por importe facturado, no cotizado." />
          </h3>
          <p className="mt-1 text-scale-xs text-text-muted">
            Dependencia sobre los principales registros de {dimension}. Basado en importe facturado.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="h-4 w-full overflow-hidden rounded-full bg-bg-elevated flex">
          {pctTop1 > 0 && (
            <TooltipDato
              style={{ width: `${pctTop1}%` }}
              contenido={
              <div className="space-y-1">
                <p className="font-medium text-text-primary">Top 1</p>
                <p className="tabular-nums text-text-secondary">
                  {formatMonedaCorta(sumTop1)} · {formatPct(pctTop1)} del facturado
                </p>
              </div>
            }>
              <div className="h-full w-full transition-all duration-500 ease-out bg-accent" />
            </TooltipDato>
          )}
          {pctTop2to5 > 0 && (
            <TooltipDato
              style={{ width: `${pctTop2to5}%` }}
              contenido={
              <div className="space-y-1">
                <p className="font-medium text-text-primary">Top 2–5</p>
                <p className="tabular-nums text-text-secondary">
                  {formatMonedaCorta(sumTop2to5)} · {formatPct(pctTop2to5)} del facturado
                </p>
              </div>
            }>
              <div className="h-full w-full transition-all duration-500 ease-out bg-accent-deep" />
            </TooltipDato>
          )}
          {pctTop6to20 > 0 && (
            <TooltipDato
              style={{ width: `${pctTop6to20}%` }}
              contenido={
              <div className="space-y-1">
                <p className="font-medium text-text-primary">Top 6–20</p>
                <p className="tabular-nums text-text-secondary">
                  {formatMonedaCorta(sumTop6to20)} · {formatPct(pctTop6to20)} del facturado
                </p>
              </div>
            }>
              <div className="h-full w-full transition-all duration-500 ease-out bg-text-muted opacity-80" />
            </TooltipDato>
          )}
          {pctResto > 0 && (
            <TooltipDato
              style={{ width: `${pctResto}%` }}
              contenido={
              <div className="space-y-1">
                <p className="font-medium text-text-primary">Resto</p>
                <p className="tabular-nums text-text-secondary">
                  {formatMonedaCorta(sumResto)} · {formatPct(pctResto)} del facturado
                </p>
              </div>
            }>
              <div className="h-full w-full transition-all duration-500 ease-out bg-bg-elevated brightness-90" />
            </TooltipDato>
          )}
        </div>
        
        <div className="flex justify-between items-center text-scale-xs mt-2">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> <span className="text-text-primary">Top 1</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent-deep" /> <span className="text-text-primary">Top 2–5</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-text-muted opacity-80" /> <span className="text-text-primary">Top 6–20</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-bg-elevated brightness-90 border border-border" /> <span className="text-text-primary">Resto</span></div>
          </div>
        </div>

        {mostradorCuentas > 0 && (
          <p className="mt-3 text-scale-xs text-text-muted">
            Fuera del cálculo: {mostradorCuentas}{' '}
            {mostradorCuentas === 1 ? 'cuenta genérica' : 'cuentas genéricas'} de mostrador por{' '}
            <span className="tabular-nums">{formatMonedaCorta(mostradorFacturado)}</span>{' '}
            facturados. Son tráfico de piso con miles de RFC detrás, no un cliente
            del que se dependa.
          </p>
        )}

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
