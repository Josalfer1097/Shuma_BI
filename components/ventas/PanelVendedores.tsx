'use client'

import React from 'react'
import { FilaRanking } from '@/lib/ventas'
import { formatMonedaCorta } from '@/lib/ventas'
import { Select } from '../ui/Select'

interface PanelVendedoresProps {
  dataVendedores: FilaRanking[]
}

type MetricaOrden = 'facturado' | 'cotizado' | 'conversion' | 'tiempo'

export function PanelVendedores({ dataVendedores }: PanelVendedoresProps) {
  const [orden, setOrden] = React.useState<MetricaOrden>('facturado')

  // Solo vendedores de canal externo (1) con actividad. El pipeline
  // intercompania (2) y de gobierno (3) distorsiona las metricas.
  const activos = dataVendedores.filter(
    (v) => v.canal === 'externo' && (v.impFacturado > 0 || v.impCotizado > 0)
  )

  const maxFacturado = Math.max(...activos.map(v => v.impFacturado), 1)
  const maxCotizado = Math.max(...activos.map(v => v.impCotizado), 1)

  const ordenados = [...activos].sort((a, b) => {
    switch (orden) {
      case 'facturado':
        return b.impFacturado - a.impFacturado
      case 'cotizado':
        return b.impCotizado - a.impCotizado
      case 'conversion': {
        const convA = a.impCotizado > 0 ? a.impFacturado / a.impCotizado : 0
        const convB = b.impCotizado > 0 ? b.impFacturado / b.impCotizado : 0
        return convB - convA
      }
      case 'tiempo': {
        const tA = a.sinSeguimientoPct ?? 0
        const tB = b.sinSeguimientoPct ?? 0
        return tB - tA // Mayor porcentaje de olvido
      }
      default:
        return 0
    }
  })

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-text-primary font-medium">Seguimiento por vendedor</h3>
          <p className="text-text-muted text-scale-xs mt-1">
            Canal externo. Comparativa de conversión.
          </p>
        </div>
        <Select
          value={orden}
          onChange={(e) => setOrden(e.target.value as MetricaOrden)}
          options={[
            { label: 'Mayor facturación', value: 'facturado' },
            { label: 'Mayor cotización', value: 'cotizado' },
            { label: 'Mejor conversión', value: 'conversion' },
            { label: 'Mayor riesgo', value: 'tiempo' }
          ]}
          className="text-scale-xs py-1"
        />
      </div>

      <div className="space-y-4">
        {ordenados.map((vendedor) => {
          const pctFacturado = (vendedor.impFacturado / maxFacturado) * 100
          const pctCotizado = (vendedor.impCotizado / maxCotizado) * 100
          const conversion = vendedor.impCotizado > 0
            ? ((vendedor.impFacturado / vendedor.impCotizado) * 100).toFixed(1)
            : '0.0'

          return (
            <div key={vendedor.dimensionId} className="group relative">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-scale-sm font-medium text-text-primary truncate pr-4">
                  {vendedor.nombre}
                </span>
                <span className="text-scale-xs font-mono text-text-muted shrink-0">
                  {conversion}% conv
                </span>
              </div>

              <div className="relative h-2 w-full rounded-full bg-border overflow-hidden mb-1">
                <div
                  className="absolute top-0 left-0 h-full bg-text-muted opacity-40 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pctCotizado}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pctFacturado}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-scale-xs mt-1 text-text-muted">
                <div className="flex gap-3">
                  <span className="text-accent">{formatMonedaCorta(vendedor.impFacturado)} fact</span>
                  <span>{formatMonedaCorta(vendedor.impCotizado)} cotiz</span>
                </div>
                <span>
                  {vendedor.sinSeguimientoPct !== null ? `${vendedor.sinSeguimientoPct.toFixed(0)}% olvidado` : '--'}
                </span>
              </div>
            </div>
          )
        })}

        {activos.length === 0 && (
          <div className="py-8 text-center text-text-muted text-scale-sm border border-dashed border-border rounded">
            No hay actividad de canal externo en este periodo.
          </div>
        )}
      </div>
    </div>
  )
}
