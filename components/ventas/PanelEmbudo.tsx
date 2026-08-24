'use client'

import {
  ETIQUETA_SIN_SEGUIMIENTO,
  ETIQUETA_SUSPENDIDA,
  formatMonedaCorta,
  formatPct,
  type FilaRankingVista,
} from '@/lib/ventas'
import { Rotulo } from '../ui/Rotulo'
import { Tooltip } from '../ui/Tooltip'
import { TooltipDato } from '../ui/TooltipDato'

/**
 * Banda de fuga. Pieza protagonista del modulo: es lo primero que se ve al
 * entrar y la unica que se permite volumen tipografico.
 *
 * POR QUE ES LO PRIMERO — el tablero estaba construido como reporte de ventas
 * ("cuanto vendimos") cuando su trabajo real es "donde se esta fugando el
 * dinero". Sin seguimiento es el 52.1% del embudo y hasta v0.32.3 se veia
 * igual que una tarjeta de conteo sin comparacion.
 *
 * REGLA 1 — el tramo convertido usa imp_cot_convertido, NO imp_facturado.
 * imp_facturado esta a precio de factura y el cotizado a precio de cotizacion:
 * dividir uno entre otro da razones arriba del 100%. La etiqueta dice
 * "Cotizado que se facturo" para que nadie lo confunda con la tarjeta
 * "Facturado" de KpiRow, que es otra cifra.
 *
 * REGLA 3 — "sin seguimiento" es el status F: el SGE suspende sola la
 * cotizacion a los diez dias sin actividad. No es venta perdida. Es distinto
 * de "suspendida a mano", que si fue una decision de alguien. Ninguna etiqueta
 * emite juicio.
 *
 * REGLA 7 — canal externo unicamente, aunque el filtro este en "Todos".
 * Mostrador abandona el 93.3% por naturaleza del canal: mezclarlo haria que la
 * fuga se viera enorme por una razon que no es un problema.
 *
 * Los cinco tramos suman el cotizado. Si no suman, hay un estado nuevo en el
 * SGE y hay que reportarlo, no rellenar la diferencia.
 */

type PanelEmbudoProps = {
  ranking: FilaRankingVista[] | null | undefined
}

const AYUDA_PANEL =
  'En que termino cada peso cotizado del canal externo, sobre el periodo completo. ' +
  'Los cinco tramos suman el total cotizado. El tramo convertido esta medido a precio ' +
  'de cotizacion, no de factura: es la unica forma de que las partes sumen el todo.'

const TOLERANCIA = 0.001

function EstadoVacio() {
  return (
    <section className="mb-8 flex min-h-[168px] items-center justify-center rounded-lg bg-bg-elevated px-6 py-8">
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
        'El SGE suspende sola la cotizacion a los diez dias sin actividad. No es que el ' +
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
      color: 'bg-neutral',
      ayuda: 'Alguien la suspendio deliberadamente. Es una decision, no un vencimiento.',
    },
    {
      label: 'Cancelado',
      valor: suma('imp_cancelado'),
      color: 'bg-neutral opacity-40',
      ayuda: 'Cotizaciones canceladas de forma explicita.',
    },
  ]

  const sumaTramos = tramos.reduce((acc, t) => acc + t.valor, 0)
  const diferencia = totalCotizado - sumaTramos
  const descuadra = Math.abs(diferencia) > totalCotizado * TOLERANCIA

  const fuga = tramos[1]
  const fugaPct = (fuga.valor / totalCotizado) * 100

  return (
    <section className="mb-8 rounded-lg bg-bg-elevated px-6 py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <Rotulo className="mb-1.5">Fuga del periodo</Rotulo>
          <p className="flex items-baseline gap-3">
            <span className="font-exo text-scale-3xl leading-none tabular-nums text-danger">
              {formatMonedaCorta(fuga.valor)}
            </span>
            <span className="font-exo text-scale-xl leading-none tabular-nums text-text-secondary">
              {formatPct(fugaPct)}
            </span>
          </p>
          <p className="mt-2 max-w-md text-scale-xs text-text-muted">
            Cotizaciones que el sistema suspendió solo a los diez días sin que nadie las
            tocara. Canal externo, periodo completo.
          </p>
        </div>

        <div className="text-right">
          <Rotulo className="mb-1.5 flex items-center justify-end gap-2">
            Cotizado
            <Tooltip text={AYUDA_PANEL} />
          </Rotulo>
          <span className="font-exo text-scale-xl leading-none tabular-nums text-text-primary">
            {formatMonedaCorta(totalCotizado)}
          </span>
        </div>
      </header>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-base">
        {tramos.map((tramo) => {
          const pct = (tramo.valor / totalCotizado) * 100
          if (pct <= 0) return null

          return (
            <TooltipDato
              key={tramo.label}
              className="h-full transition-all duration-500 ease-out"
              contenido={
                <div className="space-y-1">
                  <p className="font-medium text-text-primary">{tramo.label}</p>
                  <p className="tabular-nums text-text-secondary">
                    {formatMonedaCorta(tramo.valor)} · {formatPct(pct)} del cotizado
                  </p>
                  <p className="text-text-muted">{tramo.ayuda}</p>
                </div>
              }
              style={{ width: `${pct}%` }}
            >
              <div className={`h-full w-full ${tramo.color}`} />
            </TooltipDato>
          )
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {tramos.map((tramo) => {
          const pct = (tramo.valor / totalCotizado) * 100

          return (
            <li key={tramo.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${tramo.color}`} />
              <span className="text-scale-xs text-text-secondary">{tramo.label}</span>
              <span className="text-scale-xs tabular-nums text-text-muted">
                {formatPct(pct)}
              </span>
            </li>
          )
        })}
      </ul>

      {descuadra && (
        <p className="mt-4 text-scale-xs text-warning">
          Los tramos no cuadran con el cotizado por {formatMonedaCorta(Math.abs(diferencia))}.
          Puede haber un estado nuevo en el SGE: repórtalo antes de usar estas cifras.
        </p>
      )}
    </section>
  )
}
