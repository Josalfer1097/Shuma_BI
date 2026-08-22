'use client'

import {
  ETIQUETA_SIN_SEGUIMIENTO,
  ETIQUETA_SUSPENDIDA,
  formatMonedaCorta,
  formatPct,
  type FilaRankingVista,
} from '@/lib/ventas'
import { Tooltip } from '../ui/Tooltip'
import { TooltipDato } from '../ui/TooltipDato'

/**
 * Embudo de conversion. Panel de contexto: canal externo y periodo completo.
 *
 * REGLA 1 — el tramo convertido usa imp_cot_convertido, NO imp_facturado.
 * imp_facturado esta a precio de factura y el cotizado a precio de cotizacion:
 * dividir uno entre otro da razones arriba del 100%. La etiqueta dice
 * "Cotizado que se facturo" justamente para que nadie lo confunda con la
 * tarjeta "Facturado" de KpiRow, que es otra cifra.
 *
 * REGLA 3 — "sin seguimiento" es el status F: el ERP suspende sola la
 * cotizacion a los diez dias sin actividad. No es venta perdida. Es distinto
 * de "suspendida a mano", que si fue una decision de alguien.
 *
 * Los cinco tramos suman el cotizado. Si no suman, hay un estado nuevo en el
 * ERP y hay que reportarlo, no rellenar la diferencia.
 */

type PanelEmbudoProps = {
  ranking: FilaRankingVista[] | null | undefined
}

const AYUDA_PANEL =
  'Muestra en que termino cada peso cotizado del canal externo, sobre el periodo completo. ' +
  'Los cinco tramos suman el total cotizado. El tramo convertido esta medido a precio de ' +
  'cotizacion, no de factura, que es la unica forma de que las partes sumen el todo.'

function EstadoVacio() {
  return (
    <section className="mb-8 flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-bg-surface p-5">
      <p className="text-scale-sm text-text-muted">
        No hay cotizaciones de canal externo en este periodo. Cambia el filtro de canal
        o de periodo para verlo.
      </p>
    </section>
  )
}

export function PanelEmbudo({ ranking }: PanelEmbudoProps) {
  if (!ranking || ranking.length === 0) return <EstadoVacio />

  const soloExterno = ranking.filter(
    (r) => r.dimension === 'cliente' && r.canal === 'externo',
  )

  if (soloExterno.length === 0) return <EstadoVacio />

  const suma = (campo: keyof FilaRankingVista): number =>
    soloExterno.reduce((acc, r) => acc + (Number(r[campo]) || 0), 0)

  const totalCotizado = suma('imp_cotizado')

  if (totalCotizado <= 0) return <EstadoVacio />

  const tramos = [
    {
      label: 'Cotizado que se facturó',
      valor: suma('imp_cot_convertido'),
      color: 'bg-accent',
      ayuda:
        'Importe cotizado de las lineas que llegaron a factura, medido a precio de ' +
        'cotizacion. No es la cifra de la tarjeta "Facturado": esa esta a precio de factura.',
    },
    {
      label: ETIQUETA_SIN_SEGUIMIENTO,
      valor: suma('imp_sin_seguimiento'),
      color: 'bg-danger',
      ayuda:
        'El ERP suspende sola la cotizacion a los diez dias sin actividad. No es que el ' +
        'cliente dijera que no: es que nadie volvio a hablarle.',
    },
    {
      label: 'Vivo al corte',
      valor: suma('imp_en_proceso'),
      color: 'bg-warning',
      ayuda: 'Cotizaciones abiertas y con actividad reciente al momento de la ultima carga.',
    },
    {
      label: ETIQUETA_SUSPENDIDA,
      valor: suma('imp_suspendido'),
      color: 'bg-text-muted',
      ayuda: 'Alguien la suspendio deliberadamente. Es una decision, no un vencimiento.',
    },
    {
      label: 'Cancelado',
      valor: suma('imp_cancelado'),
      color: 'bg-bg-elevated',
      ayuda: 'Cotizaciones canceladas de forma explicita.',
    },
  ]

  const sumaTramos = tramos.reduce((acc, t) => acc + t.valor, 0)
  const diferencia = totalCotizado - sumaTramos
  const descuadra = Math.abs(diferencia) > totalCotizado * 0.001

  return (
    <section className="mb-8 min-h-[260px] rounded-lg border border-border bg-bg-surface p-5">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-medium text-text-primary">
            Embudo de conversión
            <Tooltip text={AYUDA_PANEL} />
          </h3>
          <p className="mt-1 text-scale-xs text-text-muted">
            Canal externo, periodo completo. Los cinco tramos suman el cotizado.
          </p>
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-scale-xs text-text-muted">Cotizado</span>
          <span className="block text-scale-lg tabular-nums text-text-primary">
            {formatMonedaCorta(totalCotizado)}
          </span>
        </span>
      </header>

      <div className="flex flex-col gap-3">
        {tramos.map((tramo) => {
          const pct = (tramo.valor / totalCotizado) * 100

          return (
            <TooltipDato
              key={tramo.label}
              contenido={
                <div className="space-y-1">
                  <p className="font-medium text-text-primary">{tramo.label}</p>
                  <p className="tabular-nums text-text-secondary">
                    {formatMonedaCorta(tramo.valor)} · {formatPct(pct)} del cotizado
                  </p>
                  <p className="text-text-muted">{tramo.ayuda}</p>
                </div>
              }
            >
              <div className="flex flex-col gap-1 text-scale-sm">
                <div className="flex justify-between font-medium">
                  <span className="text-text-primary">{tramo.label}</span>
                  <span className="text-text-primary tabular-nums">
                    {formatMonedaCorta(tramo.valor)}{' '}
                    <span className="ml-1 inline-block w-14 text-right font-normal tabular-nums text-text-muted">
                      {formatPct(pct)}
                    </span>
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${tramo.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </TooltipDato>
          )
        })}
      </div>

      {descuadra && (
        <p className="mt-4 text-right text-scale-xs text-warning">
          Los tramos no cuadran con el cotizado por {formatMonedaCorta(Math.abs(diferencia))}.
          Puede haber un estado nuevo en el ERP: repórtalo antes de usar estas cifras.
        </p>
      )}
    </section>
  )
}
