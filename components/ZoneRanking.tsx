'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { formatDecimal } from '@/lib/format'

interface ZoneRankingProps {
  data: {
    zona: string;
    mediana_dias: number;
    promedio_dias: number;
    total: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-sm z-50 relative">
        <p className="text-text-primary font-medium mb-1">{data.zona}</p>
        <p className="text-accent">
          Tiempo típico: <span className="font-semibold">{formatDecimal(data.mediana_dias)}d</span>
        </p>
      </div>
    )
  }
  return null
}

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
      fontSize={isLong ? 9 : 11}
    >
      {payload.value}
    </text>
  );
};

export function ZoneRanking({ data }: ZoneRankingProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedZone = searchParams.get('zona')

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-[400px] flex items-center justify-center">
        <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
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
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const slowestZoneValue = Math.max(...data.map(d => d.mediana_dias))
  
  // Ensure each bar has a minimum touch target size (e.g. 32px height)
  const minChartHeight = 400
  const chartHeight = Math.max(minChartHeight, data.length * 32 + 60) // 32px per bar + margins

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h3 className="text-text-primary font-medium mb-4 sm:mb-6">Ranking por zona</h3>
      <div className="overflow-y-auto overflow-x-hidden max-h-[420px] sm:max-h-none w-full pr-1 custom-scrollbar">
        <div style={{ height: `${chartHeight}px` }} className="w-full min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis 
                type="number"
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category"
                dataKey="zona" 
                tickLine={false}
                axisLine={false}
                width={100}
                tick={<CustomYAxisTick />}
              />
              <RechartsTooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'var(--bg-elevated)', opacity: 0.4 }}
                trigger="click"
              />
              <Bar 
                dataKey="mediana_dias" 
                radius={[0, 4, 4, 0]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) => handleBarClick(data.zona)}
                className="cursor-pointer"
              >
                {data.map((entry, index) => {
                  const isSelected = selectedZone === entry.zona
                  const hasSelection = !!selectedZone
                  const isSlowest = entry.mediana_dias === slowestZoneValue
                  
                  const baseColor = isSlowest ? 'var(--warning)' : 'var(--accent)'
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
