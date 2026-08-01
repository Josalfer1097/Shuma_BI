'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/types'
import { formatNumber, formatPercent } from '@/lib/format'
import { Clock } from 'lucide-react'

interface AuthTypesPanelProps {
  metrics: DashboardMetrics | null;
}

export function AuthTypesPanel({ metrics }: AuthTypesPanelProps) {
  if (!metrics || metrics.total === 0) {
    return null
  }

  const authData = [
    { label: 'Credito del cliente (CXC)', count: metrics.con_autoriz_cxc ?? 0 },
    { label: 'Descuentos', count: metrics.con_autoriz_descuentos ?? 0 },
    { label: 'Cambio de lista de precios', count: metrics.con_autoriz_lista ?? 0 },
  ]

  const totalAuths = authData.reduce((acc, curr) => acc + curr.count, 0)

  if (totalAuths === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-6 flex flex-col items-center justify-center mb-8 gap-3">
        <Clock className="w-5 h-5 text-text-muted" />
        <span className="text-text-muted text-sm text-center">
          El desglose por tipo de autorización aparecerá cuando el proceso automático cargue los datos
        </span>
      </div>
    )
  }

  // Sort by count descending for better visual presentation, though the prompt
  // didn't strictly require it, it makes sense for bar charts. Let's just 
  // display them in the given order if we want to follow it strictly, but 
  // sorting is generally better. The prompt order: CXC, Desc, Lista.
  // We'll keep the prompt's logical order, which matches frequency typically.
  
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-6 mb-8">
      <h3 className="text-text-primary font-medium mb-5">Tipo de autorización</h3>
      
      <div className="space-y-4">
        {authData.map((item) => {
          const percentage = item.count / metrics.total
          const percentageFormatted = formatPercent(item.count, metrics.total)
          const barWidth = Math.min(percentage * 100, 100)
          
          return (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end text-sm">
                <span className="text-text-secondary font-medium">{item.label}</span>
                <div className="flex gap-2 items-baseline">
                  <span className="text-xs text-text-muted">{formatNumber(item.count)}</span>
                  <span className="font-semibold text-text-primary">{percentageFormatted}</span>
                </div>
              </div>
              <div className="w-full bg-bg-elevated h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <p className="text-xs text-text-muted italic leading-relaxed">
          Una cotizacion puede requerir varias autorizaciones a la vez, por eso los porcentajes suman mas de 100%.
        </p>
      </div>
    </div>
  )
}
