'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/types'
import { formatDecimal, formatPercent } from '@/lib/format'
import { Clock } from 'lucide-react'
import { Tooltip } from './ui/Tooltip'

interface StagesChartProps {
  metrics: DashboardMetrics | null;
}

export function StagesChart({ metrics }: StagesChartProps) {
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
  ].filter(s => s.value !== null && s.value > 0) as { key: string; label: string; value: number }[]

  if (stages.length === 0) {
    return emptyState;
  }

  const totalCycle = stages.reduce((acc, curr) => acc + curr.value, 0)
  
  // Find slowest stage
  const slowestStage = stages.reduce((prev, current) => (prev.value > current.value) ? prev : current, stages[0])

  // Colors array from darkest to lightest blue (assuming 6 stages)
  // Accent in dark mode is #4DA9F7. Let's use opacity steps or specific colors.
  const blueShades = [
    '#1E4E8C', // accent-deep equivalent
    '#2563EB',
    '#3B82F6',
    '#60A5FA',
    '#93C5FD',
    '#BFDBFE'
  ]

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-6 mb-8 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-text-primary font-medium">Desglose por etapa</h3>
          <p className="text-text-muted text-scale-sm mt-0.5">¿En que parte del proceso se va el tiempo?</p>
        </div>
        <Tooltip text="Divide el tiempo total de entrega en las seis etapas del proceso. La barra completa representa el 100% del ciclo y la etapa mas lenta se resalta. Sirve para saber donde atacar primero: reducir la etapa mas grande tiene mucho mas impacto que optimizar las pequeñas." />
      </div>
      
      {/* 100% Stacked Bar */}
      <div className="w-full min-h-[2rem] sm:min-h-[2.5rem] flex rounded overflow-hidden mb-6">
        {stages.map((stage, i) => {
          const width = (stage.value / totalCycle) * 100
          const isSlowest = stage.key === slowestStage.key
          const bgColor = isSlowest ? 'var(--warning)' : blueShades[i % blueShades.length]
          
          return (
            <div 
              key={stage.key}
              style={{ width: `${width}%`, backgroundColor: bgColor }}
              className="h-full flex items-center justify-center transition-all duration-300 border-r border-bg-surface last:border-r-0 group relative"
              title={`${stage.label}: ${formatDecimal(stage.value)}d (${formatPercent(stage.value, totalCycle)})`}
            >
              {width > 8 && (
                <span className="text-[10px] sm:text-scale-xs font-semibold text-white truncate px-1 opacity-90 drop-shadow-md">
                  {formatPercent(stage.value, totalCycle)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 mb-6">
        {stages.map((stage, i) => {
          const isSlowest = stage.key === slowestStage.key
          const bgColor = isSlowest ? 'var(--warning)' : blueShades[i % blueShades.length]
          
          return (
            <div key={stage.key} className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: bgColor }} />
                <span className="text-scale-xs text-text-secondary font-medium truncate" title={stage.label}>{stage.label}</span>
              </div>
              <span className="text-scale-sm font-semibold text-text-primary">
                {formatDecimal(stage.value)}d
              </span>
            </div>
          )
        })}
      </div>

      {/* Conclusion Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-scale-sm text-text-primary mb-2">
          La etapa mas lenta es <strong className="font-semibold">{slowestStage.label}</strong>, 
          con {formatDecimal(slowestStage.value)} dias ({formatPercent(slowestStage.value, totalCycle)} del ciclo).
        </p>
        <p className="text-scale-xs text-text-muted leading-relaxed">
          La etapa &quot;Surtido&quot; aparece en cero porque en el sistema la recepcion y el surtido se registran casi al mismo tiempo, no como dos momentos separados.
        </p>
      </div>
    </div>
  )
}
