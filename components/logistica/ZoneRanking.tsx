'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import { formatDecimal } from '@/lib/format'
import { Tooltip as CustomUITooltip } from '../ui/Tooltip'
import { useEmpresa } from '@/lib/empresaContext'
import { useFontScale } from '@/lib/fontScaleContext'

interface ZoneRankingProps {
  data: {
    zona: string;
    mediana_dias: number;
    promedio_dias: number;
    total: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, onFilter, selectedZone }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isSelected = selectedZone === data.zona
    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-scale-sm z-50 relative pointer-events-auto">
        <p className="text-text-primary font-medium mb-1">{data.zona}</p>
        <p className="text-accent mb-3">
          Tiempo típico: <span className="font-semibold">{formatDecimal(data.mediana_dias)}d</span>
        </p>
        <button 
          onClick={() => onFilter(data.zona)}
          className="w-full text-center py-1.5 px-3 bg-bg-surface hover:bg-bg-base border border-border rounded text-scale-xs font-medium transition-colors"
        >
          {isSelected ? 'Quitar filtro de esta zona' : 'Filtrar por esta zona'}
        </button>
      </div>
    )
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  return (
    <text 
      x={x + width + 8} 
      y={y + height / 2} 
      dy={4}
      fill="var(--text-secondary)" 
      fontSize={Math.round(11 * props.scale)} 
      fontWeight={500}
      textAnchor="start"
    >
      {formatDecimal(value)}d
    </text>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomYAxisTick = ({ x, y, payload }: any) => {
  const isLong = payload.value.length > 12;
  return (
    <text 
      x={x} 
      y={y} 
      dy={4} 
      textAnchor="end" 
      fill="var(--text-muted)" 
      fontSize={isLong ? Math.round(9 * payload.scale) : Math.round(11 * payload.scale)}
    >
      {payload.value}
    </text>
  );
};

export function ZoneRanking({ data }: ZoneRankingProps) {
  const router = useRouter()
  // Ruta actual en vez de '/' escrito a mano: el modulo puede vivir en
  // cualquier ruta y los filtros deben quedarse dentro de ella.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedZone = searchParams.get('zona')
  const { scale } = useFontScale()
  const { metaDias } = useEmpresa()

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-[400px] flex items-center justify-center">
        <span className="text-text-muted text-scale-sm">Sin datos para la selección actual</span>
      </div>
    )
  }

  const handleBarClick = (zone: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedZone === zone) {
      params.delete('zona')
    } else {
      params.set('zona', zone)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const slowestZoneValue = Math.max(...data.map(d => d.mediana_dias))
  
  // Ensure each bar has a minimum touch target size (e.g. 32px height)
  const minChartHeight = 400
  const chartHeight = Math.max(minChartHeight, data.length * Math.round(32 * scale) + 60) // scale space per bar + margins

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-text-primary font-medium">Ranking por zona</h3>
          <p className="text-text-muted text-scale-sm mt-0.5">¿Que zonas tardan mas en entregar?</p>
        </div>
        <CustomUITooltip text="Ordena las zonas por su tiempo tipico de entrega, de mas lenta a mas rapida. La mas lenta se resalta. Haz clic en cualquier barra para filtrar todo el tablero por esa zona." />
      </div>
      <div className="w-full pr-1 flex-1">
        <div style={{ height: `${chartHeight}px` }} className="w-full min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis 
                type="number"
                stroke="var(--text-muted)" 
                fontSize={Math.round(11 * scale)} 
                tickLine={false}
                axisLine={false}
                label={{ value: 'Dias (mediana)', position: 'insideBottom', offset: -5, style: { fill: 'var(--text-muted)', fontSize: Math.round(11 * scale) } }}
                domain={[0, 'dataMax + (dataMax * 0.1)']}
              />
              <YAxis 
                type="category"
                dataKey="zona" 
                tickLine={false}
                axisLine={false}
                width={Math.round(100 * scale)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tick={(props: any) => <CustomYAxisTick {...props} payload={{...props.payload, scale}} />}
              />
              <ReferenceLine x={metaDias} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} label={{ value: `Meta: ${metaDias}d`, position: 'insideBottomRight', fill: 'var(--danger)', fontSize: Math.round(11 * scale), offset: 10 }} />
              <RechartsTooltip 
                content={<CustomTooltip onFilter={handleBarClick} selectedZone={selectedZone} />} 
                cursor={{ fill: 'var(--bg-elevated)', opacity: 0.4 }}
                trigger="click"
              />
              <Bar 
                dataKey="mediana_dias" 
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(props: any) => <CustomLabel {...props} scale={scale} />}
              >
                {data.map((entry, index) => {
                  const isSelected = selectedZone === entry.zona
                  const hasSelection = !!selectedZone
                  const isOutOfMeta = entry.mediana_dias > metaDias
                  const isSlowest = entry.mediana_dias === slowestZoneValue
                  
                  let baseColor = 'var(--accent)'
                  if (isOutOfMeta) baseColor = 'var(--danger)'
                  else if (isSlowest) baseColor = 'var(--warning)'

                  const opacity = hasSelection && !isSelected ? 0.4 : 1
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={baseColor} 
                      fillOpacity={opacity}
                      className="transition-opacity duration-150"
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
