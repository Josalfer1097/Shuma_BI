'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { DashboardMetrics } from '@/lib/types'
import { formatDecimal, formatPercent, equivalenciaHoras } from '@/lib/format'
import { Clock } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'

interface StagesChartProps {
  metrics: DashboardMetrics | null;
}


/**
 * Detalle de una etapa al pasar el cursor o al tocarla.
 *
 * Va con createPortal a document.body porque la barra apilada tiene
 * overflow-hidden para conservar sus esquinas redondeadas, y cualquier hijo
 * posicionado se recortaria. Es el mismo patron de ui/Tooltip.
 */
function DetalleEtapa({
  etiqueta,
  dias,
  horas,
  porcentaje,
  esMasLenta,
  x,
  y,
}: {
  etiqueta: string
  dias: string
  horas: string | null
  porcentaje: string
  esMasLenta: boolean
  x: number
  y: number
}) {
  if (typeof document === 'undefined') return null

  const ancho = 190
  const izquierda = Math.min(Math.max(8, x - ancho / 2), window.innerWidth - ancho - 8)

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[9999] rounded-md border border-border bg-bg-elevated p-3 shadow-xl"
      style={{ left: izquierda, top: Math.max(8, y - 104), width: ancho }}
    >
      <p className="text-scale-sm font-semibold text-text-primary">{etiqueta}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-scale-xs text-text-muted">Tiempo mediano</span>
        <span className="text-scale-sm font-medium text-text-primary">{dias} d</span>
      </div>
      {horas && (
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-scale-xs text-text-muted">Equivale a</span>
          <span className="text-scale-xs text-text-secondary">{horas}</span>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-scale-xs text-text-muted">Del ciclo total</span>
        <span className="text-scale-sm font-medium text-text-primary">{porcentaje}</span>
      </div>
      {esMasLenta && (
        <p className="mt-2 border-t border-border pt-2 text-scale-xs text-warning">
          Es la etapa mas lenta del proceso
        </p>
      )}
    </div>,
    document.body
  )
}

export function StagesChart({ metrics }: StagesChartProps) {
  // Etapa con el detalle abierto y su posicion en pantalla. Se guarda la
  // posicion al abrir en vez de seguir el cursor: en pantalla tactil no hay
  // cursor que seguir.
  const [activa, setActiva] = useState<number | null>(null)
  const [posicion, setPosicion] = useState({ x: 0, y: 0 })

  const mostrar = (indice: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setPosicion({ x: r.left + r.width / 2, y: r.top })
    setActiva(indice)
  }
  const ocultar = () => setActiva(null)

  const emptyState = (
    <div className="bg-bg-surface border border-border rounded-lg p-6 flex flex-col items-center justify-center mb-8 gap-3">
      <Clock className="w-5 h-5 text-text-muted" />
      <span className="text-text-muted text-scale-sm text-center">
        El desglose por etapa aparecerá cuando el proceso automático cargue los datos
      </span>
    </div>
  );

  if (!metrics) {
    return emptyState;
  }

  const stages = [
    { key: 'med_cot_autorizacion', label: 'Autorizacion', value: metrics.med_cot_autorizacion },
    { key: 'med_autorizacion_recepcion', label: 'A recepcion', value: metrics.med_autorizacion_recepcion },
    { key: 'med_recepcion_surtido', label: 'Surtido', value: metrics.med_recepcion_surtido },
    { key: 'med_surtido_ruta', label: 'A ruta', value: metrics.med_surtido_ruta },
    { key: 'med_ruta_entrega', label: 'Entrega', value: metrics.med_ruta_entrega },
    { key: 'med_entrega_validacion', label: 'Validacion', value: metrics.med_entrega_validacion },
  ]
    // El orden se fija ANTES de filtrar. Con el indice del arreglo filtrado
    // bastaba con que una etapa saliera en cero un mes para que todos los
    // colores siguientes se recorrieran y dejaran de coincidir con la lista.
    .map((s, orden) => ({ ...s, orden }))
    .filter(s => s.value !== null && s.value > 0) as
      { key: string; label: string; value: number; orden: number }[]

  if (stages.length === 0) {
    return emptyState;
  }

  const totalCycle = stages.reduce((acc, curr) => acc + curr.value, 0)
  
  // Find slowest stage
  const slowestStage = stages.reduce((prev, current) => (prev.value > current.value) ? prev : current, stages[0])

  // Colors array from darkest to lightest blue (assuming 6 stages)
  // Accent in dark mode is #4DA9F7. Let's use opacity steps or specific colors.
  const blueShades = [
  'var(--etapa-1)',
  'var(--etapa-2)',
  'var(--etapa-3)',
  'var(--etapa-4)',
  'var(--etapa-5)',
  'var(--etapa-6)',
]

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-6 mb-8 flex flex-col">
      {activa !== null && (
        <DetalleEtapa
          etiqueta={stages[activa].label}
          dias={formatDecimal(stages[activa].value)}
          horas={equivalenciaHoras(stages[activa].value)}
          porcentaje={formatPercent(stages[activa].value, totalCycle)}
          esMasLenta={stages[activa].key === slowestStage.key}
          x={posicion.x}
          y={posicion.y}
        />
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-text-primary font-medium">Desglose por etapa</h3>
          <p className="text-text-muted text-scale-sm mt-0.5">¿En que parte del proceso se va el tiempo?</p>
        </div>
        <Tooltip text="Divide el tiempo total de entrega en las seis etapas del proceso. La barra completa representa el 100% del ciclo y la etapa mas lenta se resalta. Sirve para saber donde atacar primero: reducir la etapa mas grande tiene mucho mas impacto que optimizar las pequeñas." />
      </div>
      
      {/* Barra apilada al 100%.
          Los tramos usan self-stretch y NO h-full: el contenedor solo tiene
          altura FIJA (h-8), no min-height. Con min-height la altura real la
          definia el contenido, y los tramos sin etiqueta (los menores a 8% de
          ancho) no aportaban ninguna: median 24px de ancho por 0 de alto y se
          veian como huecos, aunque su color estuviera bien aplicado.
          self-stretch los llena sin depender de lo que contengan. */}
      <div className="w-full h-8 sm:h-10 flex rounded overflow-hidden mb-6">
        {stages.map((stage, i) => {
          const width = (stage.value / totalCycle) * 100
          const isSlowest = stage.key === slowestStage.key
          const bgColor = isSlowest ? 'var(--warning)' : blueShades[stage.orden % blueShades.length]
          // El texto blanco desaparece sobre los tonos claros de la escala y
          // sobre el ambar de la etapa mas lenta. Cada etapa lleva su color
          // de texto, calculado contra su propio fondo.
          const textColor = isSlowest ? 'var(--sobre-alerta)' : `var(--sobre-etapa-${(stage.orden % 6) + 1})`
          
          return (
            <button
              type="button"
              key={stage.key}
              style={{ width: `${width}%`, backgroundColor: bgColor }}
              className="self-stretch flex items-center justify-center transition-all duration-300 border-r border-bg-surface last:border-r-0 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-primary"
              aria-label={`${stage.label}: ${formatDecimal(stage.value)} dias, ${formatPercent(stage.value, totalCycle)} del ciclo`}
              onMouseEnter={(e) => mostrar(i, e.currentTarget)}
              onMouseLeave={ocultar}
              onFocus={(e) => mostrar(i, e.currentTarget)}
              onBlur={ocultar}
              onClick={(e) => (activa === i ? ocultar() : mostrar(i, e.currentTarget))}
            >
              {width > 8 && (
                <span
                  style={{ color: textColor }}
                  className="text-[10px] sm:text-scale-xs font-semibold truncate px-1"
                >
                  {formatPercent(stage.value, totalCycle)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 mb-6">
        {stages.map((stage) => {
          const isSlowest = stage.key === slowestStage.key
          const bgColor = isSlowest ? 'var(--warning)' : blueShades[stage.orden % blueShades.length]
          
          return (
            <div key={stage.key} className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: bgColor }} />
                <span className="text-scale-xs text-text-secondary font-medium truncate" title={stage.label}>{stage.label}</span>
              </div>
              <span className="text-scale-sm font-semibold text-text-primary">
                {formatDecimal(stage.value)}d
              </span>
              {/* Equivalencia en horas: 0.7 d se lee como "menos de un dia"
                  cuando en realidad son casi 17 horas. */}
              {equivalenciaHoras(stage.value) && (
                <span className="block text-scale-xs text-text-muted">
                  {equivalenciaHoras(stage.value)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Conclusion Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-scale-sm text-text-primary mb-2">
          La etapa mas lenta es <strong className="font-semibold">{slowestStage.label}</strong>, 
          con {formatDecimal(slowestStage.value)} dias
          {equivalenciaHoras(slowestStage.value) && ` (${equivalenciaHoras(slowestStage.value)})`}
          , el {formatPercent(slowestStage.value, totalCycle)} del ciclo.
        </p>
        <p className="text-scale-xs text-text-muted leading-relaxed">
          La etapa &quot;Surtido&quot; aparece en cero porque en el sistema la recepcion y el surtido se registran casi al mismo tiempo, no como dos momentos separados.
        </p>
      </div>
    </div>
  )
}
