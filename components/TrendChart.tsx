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
import { Tooltip as CustomUITooltip } from './ui/Tooltip'

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

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center">
        <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
      </div>
    )
  }

  if (data.length === 1) {
    const d = data[0]
    const [anio, mes] = d.anio_mes.split('-')
    const label = `${MONTHS_ES[mes] || mes} ${anio}`
    
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mb-8">
        <h3 className="text-text-primary font-medium mb-4 sm:mb-6">Resumen del periodo</h3>
        <div className="h-60 sm:h-80 w-full flex flex-col justify-center items-center text-center">
          <h4 className="text-lg sm:text-xl text-text-primary font-medium mb-6 sm:mb-8">{label}</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full max-w-lg">
            <div className="flex flex-col gap-1 sm:gap-2">
              <span className="text-text-muted text-xs sm:text-sm">Tiempo típico</span>
              <span className="text-2xl sm:text-3xl text-accent font-semibold">{formatDecimal(d.mediana_dias)}d</span>
            </div>
            <div className="flex flex-col gap-1 sm:gap-2">
              <span className="text-text-muted text-xs sm:text-sm">Promedio</span>
              <span className="text-2xl sm:text-3xl text-text-secondary font-semibold">{formatDecimal(d.promedio_dias)}d</span>
            </div>
            <div className="flex flex-col gap-1 sm:gap-2">
              <span className="text-text-muted text-xs sm:text-sm">Volumen</span>
              <span className="text-2xl sm:text-3xl text-text-primary font-semibold">{formatNumber(d.total)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatXAxis = (tickItem: string) => {
    const [anio, mes] = tickItem.split('-')
    const shortMonth = MONTHS_ES[mes]?.substring(0, 3) || mes
    const shortYear = anio.substring(2)
    return `${shortMonth} ${shortYear}`
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mb-8 flex flex-col">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-text-primary font-medium">Tendencia mensual</h3>
          <p className="text-text-muted text-sm mt-0.5">¿Estamos mejorando o empeorando mes a mes?</p>
        </div>
        <CustomUITooltip text="La linea solida es la mediana: lo que tarda una entrega tipica. La punteada es el promedio, que sube cuando hay entregas muy lentas. Cuando las dos lineas se separan, ese mes hubo casos extremos. Si el promedio sube pero la mediana se mantiene, el problema son casos aislados y no el proceso general." />
      </div>
      <div className="h-60 sm:h-80 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="anio_mes" 
              stroke="var(--text-muted)" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={formatXAxis}
              minTickGap={30}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
              dx={-10}
              label={{ value: 'Dias', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--text-muted)', fontSize: 11 } }}
            />
            <RechartsTooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} 
              trigger="click"
            />
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
      
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent absolute"></div>
          </div>
          <span className="text-sm text-text-secondary">Mediana (caso tipico)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 border-b-2 border-dashed border-text-muted"></div>
          <span className="text-sm text-text-secondary">Promedio</span>
        </div>
      </div>
    </div>
  )
}
