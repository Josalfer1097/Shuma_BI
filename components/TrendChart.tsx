'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts'
import { formatNumber, formatDecimal } from '@/lib/format'

interface TrendChartProps {
  data: {
    anio_mes: string;
    mediana_dias: number;
    promedio_dias: number;
    total: number;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-sm">
        <p className="text-text-muted mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-accent flex justify-between gap-4">
            <span>Tiempo típico:</span> 
            <span className="font-semibold">{formatDecimal(data.mediana_dias)}d</span>
          </p>
          <p className="text-text-secondary flex justify-between gap-4">
            <span>Promedio:</span> 
            <span className="font-semibold">{formatDecimal(data.promedio_dias)}d</span>
          </p>
          <p className="text-text-primary flex justify-between gap-4 mt-2 pt-2 border-t border-border">
            <span>Volumen:</span> 
            <span className="font-semibold">{formatNumber(data.total)}</span>
          </p>
        </div>
      </div>
    )
  }
  return null
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-5 h-80 flex items-center justify-center">
        <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
      </div>
    )
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 mb-8">
      <h3 className="text-text-primary font-medium mb-6">Tendencia mensual</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="anio_mes" 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            <Line 
              type="monotone" 
              dataKey="mediana_dias" 
              stroke="var(--accent)" 
              strokeWidth={2}
              dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="promedio_dias" 
              stroke="var(--text-muted)" 
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
