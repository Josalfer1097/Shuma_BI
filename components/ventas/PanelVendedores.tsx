'use client'

import { useState } from 'react'
import {
  construirRankingDesdeVista,
  formatMonedaCorta,
  formatPct,
  type FilaRanking,
  type FilaRankingVista,
} from '@/lib/ventas'
import { Select } from '../ui/Select'
import { Tooltip } from '../ui/Tooltip'
import { TooltipDato } from '../ui/TooltipDato'

/**
 * Seguimiento por vendedor. Panel de contexto, siempre visible.
 *
 * REGLA 7 — el indicador se calcula SOLO sobre canal externo, aunque el filtro
 * de la pagina este en "Todos". Mostrador abandona el 93.3% por naturaleza del
 * canal e intercompania convierte al 98%: mezclarlos aplana las diferencias
 * entre vendedores, que es lo unico que este panel existe para mostrar.
 *
 * REGLA 1 — la conversion NUNCA es impFacturado / impCotizado. El precio sube
 * entre cotizacion y factura y esa razon pasa del 100%. Se usa
 * `convImportePct`, que lib/ventas.ts calcula con impCotConvertido de
 * numerador y entrega en escala 0-100.
 *
 * REGLA 3 — "sin seguimiento" es el status F: el SGE suspende sola la
 * cotizacion a los diez dias sin actividad. No es venta perdida y la interfaz
 * no emite juicio. Nada de "olvidado", "perdido" ni "riesgo".
 *
 * ORIGEN DE DATOS — recibe `ranking`, la vista completa sin filtrar. NO puede
 * recibir el detalle del mes: ese viene con .eq('dimension', dimensionParam) y
 * no tiene filas de vendedor salvo que el usuario haya elegido esa dimension a
 * mano. Por eso el panel salia vacio en v0.32.0.
 */

const PISO_COTIZADO = 1_000_000
const MAXIMO_FILAS = 8

type MetricaOrden = 'seguimiento' | 'facturado' | 'cotizado' | 'conversion'

const OPCIONES_ORDEN: { label: string; value: MetricaOrden }[] = [
  { label: 'Sin seguimiento', value: 'seguimiento' },
  { label: 'Mayor facturación', value: 'facturado' },
  { label: 'Mayor cotización', value: 'cotizado' },
  { label: 'Mejor conversión', value: 'conversion' },
]

type PanelVendedoresProps = {
  ranking: FilaRankingVista[] | null | undefined
  entidadParam?: string | null
}

function ordenar(filas: FilaRanking[], orden: MetricaOrden): FilaRanking[] {
  const copia = filas.slice()

  switch (orden) {
    case 'seguimiento':
      return copia.sort((a, b) => (b.sinSeguimientoPct ?? 0) - (a.sinSeguimientoPct ?? 0))
    case 'facturado':
      return copia.sort((a, b) => b.impFacturado - a.impFacturado)
    case 'cotizado':
      return copia.sort((a, b) => b.impCotizado - a.impCotizado)
    case 'conversion':
      return copia.sort((a, b) => b.convImportePct - a.convImportePct)
    default:
      return copia
  }
}

export function PanelVendedores({ ranking, entidadParam }: PanelVendedoresProps) {
  const [orden, setOrden] = useState<MetricaOrden>('seguimiento')

  if (!ranking || ranking.length === 0) return null

  const soloExterno = ranking.filter(
    (r) => r.dimension === 'vendedor' && r.canal === 'externo',
  )

  if (soloExterno.length === 0) return null

  const activos = construirRankingDesdeVista(soloExterno, 'vendedor').filter(
    (f) => f.impCotizado >= PISO_COTIZADO,
  )

  const filas = ordenar(activos, orden).slice(0, MAXIMO_FILAS)

  // Denominador unico para las dos barras. Con maximos separados, la barra de
  // facturado puede verse mas larga que la de cotizado y sugiere haber
  // facturado mas de lo que se cotizo.
  const maxCotizado = filas.reduce((mayor, f) => Math.max(mayor, f.impCotizado), 1)

  return (
    <section className="mb-8 rounded-lg border border-border bg-bg-surface p-5">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-medium text-text-primary">
            Seguimiento por vendedor
            <Tooltip text="Canal externo por regla de negocio. La conversión usa importe convertido como numerador. 'Sin seguimiento' es la suspensión automática a los diez días." />
          </h3>
          <p className="mt-1 text-scale-xs text-text-muted">
            Canal externo, periodo completo. La barra clara es lo cotizado; la
            sólida, lo facturado.
          </p>
        </div>
        <Select
          value={orden}
          onChange={(e) => setOrden(e.target.value as MetricaOrden)}
          options={OPCIONES_ORDEN}
          className="shrink-0 py-1 text-scale-xs"
        />
      </header>

      {filas.length === 0 ? (
        <div className="rounded border border-dashed border-border py-8 text-center text-scale-sm text-text-muted">
          Ningún vendedor supera el piso de cotización en este periodo.
        </div>
      ) : (
        <ul className="space-y-4">
          {filas.map((f) => {
            const anchoCotizado = (f.impCotizado / maxCotizado) * 100
            const anchoFacturado = (f.impFacturado / maxCotizado) * 100
            const pctSeg = f.sinSeguimientoPct
            const resaltado = entidadParam != null && entidadParam === f.dimensionId

            return (
              <li
                key={f.dimensionId}
                className={
                  resaltado
                    ? '-mx-2 rounded border-l-2 border-accent bg-bg-elevated px-2 py-1.5'
                    : undefined
                }
              >
                <TooltipDato
                  contenido={
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">{f.nombre}</p>
                      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-text-secondary tabular-nums">
                        <span>Cotizado:</span>
                        <span className="text-right">{formatMonedaCorta(f.impCotizado)}</span>
                        <span>Facturado:</span>
                        <span className="text-right">{formatMonedaCorta(f.impFacturado)}</span>
                        <span>Conversión:</span>
                        <span className="text-right">{formatPct(f.convImportePct)}</span>
                        <span>Sin seg.:</span>
                        <span className="text-right">{formatPct(pctSeg)}</span>
                      </div>
                    </div>
                  }
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="truncate text-scale-sm font-medium text-text-primary">
                      {f.nombre}
                    </span>
                    <span className="shrink-0 font-mono text-scale-xs text-text-muted">
                      {formatPct(f.convImportePct)} conv.
                    </span>
                  </div>
  
                  <div className="relative mb-1 h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-text-muted opacity-30"
                      style={{ width: `${anchoCotizado}%` }}
                    />
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-accent"
                      style={{ width: `${anchoFacturado}%` }}
                    />
                  </div>
  
                  <div className="mt-1 flex items-center justify-between gap-4 text-scale-xs text-text-muted">
                    <span className="flex gap-3 tabular-nums">
                      <span className="text-accent">
                        {formatMonedaCorta(f.impFacturado)} fact.
                      </span>
                      <span>{formatMonedaCorta(f.impCotizado)} cotiz.</span>
                    </span>
                    <span
                      className={
                        pctSeg !== null && pctSeg > 30
                          ? 'text-danger font-medium'
                          : pctSeg !== null && pctSeg > 15
                            ? 'text-warning font-medium'
                            : 'text-text-muted'
                      }
                    >
                      {formatPct(pctSeg)} sin seguimiento
                    </span>
                  </div>
                </TooltipDato>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
