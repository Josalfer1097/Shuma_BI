'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { formatDecimal } from '@/lib/format'
import { Tooltip as CustomUITooltip } from './ui/Tooltip'
import { META_DIAS } from '@/lib/config'

export interface StagesEvolutionData {
  anio_mes: string;
  autorizacion: number;
  a_recepcion: number;
  surtido: number;
  a_ruta: number;
  entrega: number;
  validacion: number;
}

interface StagesEvolutionChartProps {
  data: StagesEvolutionData[];
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // payload comes in the order rendered. Reversing so it displays top-to-bottom
    const reversedPayload = [...payload].reverse();
    
    // Sum total to show total days
    const totalDays = reversedPayload.reduce((sum, entry) => sum + (entry.value as number), 0);
    const meetsMeta = totalDays <= META_DIAS;

    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-sm min-w-[200px] z-[60]">
        <p className="text-text-muted mb-2 font-medium">{label}</p>
        <div className="space-y-1 mb-2">
          {reversedPayload.map((entry: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
            <div key={`item-${index}`} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-text-secondary text-xs">{entry.name}</span>
              </div>
              <span className="font-semibold text-text-primary text-xs">{formatDecimal(entry.value)}d</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border flex justify-between items-center gap-4">
          <span className="text-text-primary font-medium text-xs">Total:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary text-sm">{formatDecimal(totalDays)}d</span>
            {meetsMeta ? (
              <span className="text-success text-[10px] uppercase font-bold">✓ Meta</span>
            ) : (
              <span className="text-danger text-[10px] uppercase font-bold">✗ Meta</span>
            )}
          </div>
        </div>
      </div>
    )
  }
  return null
}

const blueShades = [
  '#1E4E8C', // Autorizacion
  '#2563EB', // A recepcion
  '#3B82F6', // Surtido
  '#60A5FA', // A ruta
  '#93C5FD', // Entrega
  '#BFDBFE'  // Validacion
]

export function StagesEvolutionChart({ data }: StagesEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center mb-8">
        <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
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
          <h3 className="text-text-primary font-medium">Evolución por etapa</h3>
          <p className="text-text-muted text-sm mt-0.5">¿En qué etapa mejoramos o empeoramos?</p>
        </div>
        <CustomUITooltip text="Muestra cómo evoluciona cada etapa del proceso mes a mes. Si el tiempo total baja, aquí se ve cuál etapa fue la que mejoró. Sirve para saber si una mejora vino de autorización, de almacén o de rutas." />
      </div>

      <div className="h-60 sm:h-80 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
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
              domain={[0, 'auto']}
              label={{ value: 'Días acumulados', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--text-muted)', fontSize: 11 } }}
            />
            
            <RechartsTooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} 
            />
            
            <ReferenceLine y={META_DIAS} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} label={{ value: `Meta: ${META_DIAS}d`, position: 'right', fill: 'var(--danger)', fontSize: 11 }} />

            {/* Rendered from bottom to top */}
            <Area type="monotone" dataKey="autorizacion" name="Autorización" stackId="1" stroke={blueShades[0]} fill={blueShades[0]} fillOpacity={0.8} />
            <Area type="monotone" dataKey="a_recepcion" name="A recepción" stackId="1" stroke={blueShades[1]} fill={blueShades[1]} fillOpacity={0.8} />
            <Area type="monotone" dataKey="surtido" name="Surtido" stackId="1" stroke={blueShades[2]} fill={blueShades[2]} fillOpacity={0.8} />
            <Area type="monotone" dataKey="a_ruta" name="A ruta" stackId="1" stroke={blueShades[3]} fill={blueShades[3]} fillOpacity={0.8} />
            <Area type="monotone" dataKey="entrega" name="Entrega" stackId="1" stroke={blueShades[4]} fill={blueShades[4]} fillOpacity={0.8} />
            <Area type="monotone" dataKey="validacion" name="Validación" stackId="1" stroke={blueShades[5]} fill={blueShades[5]} fillOpacity={0.8} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-4 border-t border-border">
        {[
          { label: 'Autorización', color: blueShades[0] },
          { label: 'A recepción', color: blueShades[1] },
          { label: 'Surtido', color: blueShades[2] },
          { label: 'A ruta', color: blueShades[3] },
          { label: 'Entrega', color: blueShades[4] },
          { label: 'Validación', color: blueShades[5] },
        ].map((stage, i) => (
          <div key={i} className="flex items-center gap-1.5 justify-center">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: stage.color }} />
            <span className="text-xs text-text-secondary font-medium truncate" title={stage.label}>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
