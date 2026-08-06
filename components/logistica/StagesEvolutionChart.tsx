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
import { Tooltip as CustomUITooltip } from '../ui/Tooltip'
import { useEmpresa } from '@/lib/empresaContext'
import { useFontScale } from '@/lib/fontScaleContext'

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
  partialMonth?: string | null;
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, partialMonth }: any) => {
  if (active && payload && payload.length) {
    // payload comes in the order rendered. Reversing so it displays top-to-bottom
    const reversedPayload = [...payload].reverse();
    
    // Sum total to show total days
    const totalDays = reversedPayload.reduce((sum, entry) => sum + (entry.value as number), 0);
    const meetsMeta = totalDays <= payload[0].payload.metaDias;
    const isPartial = partialMonth === label;

    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-scale-sm min-w-[200px] z-[60]">
        <p className="text-text-muted mb-2 font-medium">{label}</p>
        
        {isPartial && (
          <div className="mb-3 px-2 py-1.5 bg-warning/10 text-warning text-scale-xs font-medium rounded border border-warning/20">
            Datos parciales del mes en curso.
          </div>
        )}

        <div className="space-y-1 mb-2">
          {reversedPayload.map((entry: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
            <div key={`item-${index}`} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-text-secondary text-scale-xs">{entry.name}</span>
              </div>
              <span className="font-semibold text-text-primary text-scale-xs">{formatDecimal(entry.value)}d</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border flex justify-between items-center gap-4">
          <span className="text-text-primary font-medium text-scale-xs">Total:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary text-scale-sm">{formatDecimal(totalDays)}d</span>
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
  'var(--etapa-1)',
  'var(--etapa-2)',
  'var(--etapa-3)',
  'var(--etapa-4)',
  'var(--etapa-5)',
  'var(--etapa-6)',
]

export function StagesEvolutionChart({ data, partialMonth }: StagesEvolutionChartProps) {
  const { scale } = useFontScale()
  const { metaDias } = useEmpresa()

  const dataWithMeta = data.map(d => ({ ...d, metaDias }))

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center mb-8">
        <span className="text-text-muted text-scale-sm">Sin datos para la selección actual</span>
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
          <p className="text-text-muted text-scale-sm mt-0.5">¿En qué etapa mejoramos o empeoramos?</p>
        </div>
        <CustomUITooltip text="Muestra cómo evoluciona cada etapa del proceso mes a mes. Si el tiempo total baja, aquí se ve cuál etapa fue la que mejoró. Sirve para saber si una mejora vino de autorización, de almacén o de rutas." />
      </div>

      {/* Altura definida, no min-height: ResponsiveContainer usa height="100%"
          y un porcentaje no resuelve contra una altura automatica. Con
          min-height el area de dibujo colapsaba a cero. */}
      {/* Sin flex-1 a proposito. flex: 1 1 0% pone flex-basis en 0%, y en un
          contenedor de columna el flex-basis REEMPLAZA a la propiedad height:
          la altura explicita se ignora y el area de dibujo colapsa.
          TrendChart si conserva flex-1 porque es celda de un grid, y ahi la
          rejilla ya le da altura definida al contenedor padre. */}
      <div className="w-full" style={{ height: Math.max(240, 320 * scale) }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataWithMeta} margin={{ top: 5, right: 30, left: Math.round(-20 + (scale - 1) * -10), bottom: Math.round(5 + (scale - 1) * 15) }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="anio_mes" 
              stroke="var(--text-muted)" 
              fontSize={Math.round(11 * scale)} 
              tickLine={false}
              axisLine={false}
              dy={Math.round(10 * scale)}
              tickFormatter={formatXAxis}
              minTickGap={30}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={Math.round(11 * scale)} 
              tickLine={false}
              axisLine={false}
              dx={Math.round(-10 * scale)}
              domain={[0, 'auto']}
              label={{ value: 'Días acumulados', angle: -90, position: 'insideLeft', offset: Math.round(10 * scale), style: { fill: 'var(--text-muted)', fontSize: Math.round(11 * scale) } }}
            />
            
            <RechartsTooltip 
              content={<CustomTooltip partialMonth={partialMonth} />} 
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} 
            />
            
            <ReferenceLine y={metaDias} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} label={{ value: `Meta: ${metaDias}d`, position: 'right', fill: 'var(--danger)', fontSize: Math.round(11 * scale) }} />

            {partialMonth && (
              <ReferenceLine x={partialMonth} stroke="var(--warning)" strokeDasharray="3 3" />
            )}

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

      <div className="flex flex-wrap gap-x-6 gap-y-4 justify-center mt-6 pt-4 border-t border-border">
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
            <span className="text-scale-xs text-text-secondary font-medium truncate" title={stage.label}>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
