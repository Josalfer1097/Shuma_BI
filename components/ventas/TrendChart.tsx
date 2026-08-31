'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { formatMoneda, formatMonedaCorta, PuntoSerie } from '@/lib/ventas'
import { Tooltip as CustomUITooltip } from '../ui/Tooltip'
import { Select } from '../ui/Select'
import { useFontScale } from '@/lib/fontScaleContext'

interface TrendChartProps {
  data: PuntoSerie[];
  dataFull?: PuntoSerie[];
  anclaTour?: string;
  selectedMonth?: string | null;
  partialMonth?: string | null;
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PuntoSerie
    
    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-scale-sm max-w-[280px] z-[60]">
        <p className="text-text-muted mb-2 font-medium">{label}</p>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-accent">Facturado:</span> 
            <span className="font-semibold">{formatMoneda(data.impFacturado)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-text-secondary">Cotizado:</span> 
            <span className="font-semibold">{formatMoneda(data.impCotizado)}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload, selectedMonth } = props;
  const isSelected = selectedMonth === payload.anioMes;
  if (isSelected) {
    return (
      <circle cx={cx} cy={cy} r={6} fill="var(--warning)" stroke="var(--bg-surface)" strokeWidth={2} />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="var(--accent)" strokeWidth={0} />;
};

export function TrendChart({ data, dataFull, selectedMonth, partialMonth, anclaTour }: TrendChartProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const compMode = searchParams.get('comp') || 'anterior'
  const { scale } = useFontScale()

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center">
        <span className="text-text-muted text-scale-sm">No hay historia para mostrar. Intenta cambiar el filtro de canal o elegir otra entidad.</span>
      </div>
    )
  }

  const formatXAxis = (tickItem: string) => {
    const [anio, mes] = tickItem.split('-')
    const shortMonth = MONTHS_ES[mes]?.substring(0, 3) || mes
    const shortYear = anio.substring(2)
    return `${shortMonth} ${shortYear}`
  }

  let comparisonNode = null;
  let chartTitle = "Tendencia de facturación";
  let chartTooltip = "La línea sólida es el importe facturado y usa el eje izquierdo. La línea punteada es el cotizado y usa el eje derecho, que es de otra escala. Cada una se lee por su forma: importa si suben o bajan, no dónde se cruzan.";

  if (selectedMonth) {
    const [anio, mes] = selectedMonth.split('-')
    const label = `${MONTHS_ES[mes] || mes} ${anio}`
    chartTitle = `Tendencia — ${label} en contexto`;
    chartTooltip = "Se muestran los últimos doce meses para ubicar el mes seleccionado en contexto. El punto resaltado es el mes que elegiste.";

    const current = data[data.length - 1];
    let prev = null;
    let pLabel = '';

    const seriesToSearch = dataFull || data;

    if (compMode === 'anterior') {
      const pAnio = mes === '01' ? String(Number(anio) - 1) : anio;
      const pMes = mes === '01' ? '12' : String(Number(mes) - 1).padStart(2, '0');
      const targetAnioMes = `${pAnio}-${pMes}`;
      prev = seriesToSearch.find(d => d.anioMes === targetAnioMes) || null;
      pLabel = `${MONTHS_ES[pMes] || pMes} ${pAnio}`;
    } else if (compMode === 'anual') {
      const pAnio = String(Number(anio) - 1);
      const targetAnioMes = `${pAnio}-${mes}`;
      prev = seriesToSearch.find(d => d.anioMes === targetAnioMes) || null;
      pLabel = `${MONTHS_ES[mes] || mes} ${pAnio}`;
    }

    if (!prev) {
      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-3 mb-4 flex justify-center text-scale-sm text-text-muted">
          No hay periodo comparable ({pLabel})
        </div>
      );
    } else {
      const diffFacturado = current.impFacturado - prev.impFacturado;
      const percFacturado = prev.impFacturado > 0 ? (Math.abs(diffFacturado) / prev.impFacturado) * 100 : 0;
      
      const formatDiff = (diff: number, perc: number) => {
        const isUp = diff > 0;
        const isDown = diff < 0;
        
        let colorClass = "text-text-muted";
        if (isUp) colorClass = "text-success";
        if (isDown) colorClass = "text-danger";

        const arrow = isUp ? "▲" : isDown ? "▼" : "—";
        const sign = isUp ? "+" : isDown ? "-" : "";
        const formattedDiff = formatMonedaCorta(Math.abs(diff));
        const formattedPerc = perc.toFixed(1);
        
        return (
          <span className={colorClass}>
            {arrow} {formattedDiff} ({sign}{formattedPerc}%)
          </span>
        );
      };

      const isIncomplete = partialMonth === selectedMonth;

      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-4 mb-4 grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1 px-2">
            <span className="text-text-muted text-scale-xs">Importe facturado</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-scale-xl font-semibold leading-none mb-1.5">{formatMoneda(current.impFacturado)}</span>
              <span className="text-scale-xs font-medium">{formatDiff(diffFacturado, percFacturado)} <span className="text-text-muted opacity-70 font-normal">vs {pLabel}</span></span>
              {isIncomplete && (
                <span className="text-warning text-scale-xs mt-1 font-normal block leading-tight">
                  Periodo incompleto, puede mostrar una caída engañosa
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  const handleCompChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('comp', e.target.value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div data-tour={anclaTour} className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mb-8 flex flex-col">
      <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
        <div>
          <h3 className="text-text-primary font-medium">{chartTitle}</h3>
        </div>
        <div className="flex items-center gap-3">
          {selectedMonth && (
            <Select 
              value={compMode} 
              onChange={handleCompChange} 
              options={[
                { label: 'Mes anterior', value: 'anterior' },
                { label: 'Mismo mes año pasado', value: 'anual' }
              ]}
              className="py-1 text-scale-xs sm:min-h-[32px] pr-8"
            />
          )}
          <CustomUITooltip text={chartTooltip} />
        </div>
      </div>
      
      {comparisonNode}

      <div className="w-full" style={{ height: Math.max(240, 320 * scale) }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: Math.round(8 + (scale - 1) * 8), left: 0, bottom: Math.round(5 + (scale - 1) * 15) }}>
            <defs>
              <linearGradient id="degradadoFacturado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} opacity={0.28} />
            <XAxis 
              dataKey="anioMes" 
              stroke="var(--text-muted)" 
              fontSize={Math.round(11 * scale)} 
              tickLine={false}
              axisLine={false}
              dy={Math.round(10 * scale)}
              tickFormatter={formatXAxis}
              minTickGap={30}
            />
            {/*
              width explicito y margen izquierdo en 0.
              Antes el margen era -10 y el dx otro -10: la etiqueta se
              dibujaba 20 px fuera del area y el SVG le cortaba el inicio.
              "$45.0 M" se leia "$5.0 M" y "$500.0 k" se leia "00.0 k".
              Un eje recortado sigue pareciendo un numero valido, asi que
              nadie lo nota. Cualquier cambio aqui se revisa con la escala
              tipografica en 1.5, que es donde las etiquetas son mas anchas.
            */}
            <YAxis 
              yAxisId="facturado"
              stroke="var(--text-muted)" 
              fontSize={Math.round(11 * scale)} 
              tickLine={false}
              axisLine={false}
              width={Math.round(64 * scale)}
              tickFormatter={(val) => formatMonedaCorta(val)}
            />
            <YAxis
              yAxisId="cotizado"
              orientation="right"
              stroke="var(--text-muted)"
              fontSize={Math.round(11 * scale)}
              tickLine={false}
              axisLine={false}
              width={Math.round(70 * scale)}
              tickFormatter={(val) => formatMonedaCorta(val)}
            />
            
            {selectedMonth && (
              <ReferenceLine yAxisId="facturado" x={selectedMonth} stroke="var(--warning)" strokeDasharray="3 3" />
            )}
            
            <RechartsTooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} 
              trigger="click"
            />
            <Area
              type="monotone"
              yAxisId="facturado"
              dataKey="impFacturado"
              stroke="none"
              fill="url(#degradadoFacturado)"
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Line 
              type="monotone" 
              yAxisId="facturado"
              dataKey="impFacturado" 
              stroke="var(--accent)" 
              strokeWidth={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => <CustomDot {...props} selectedMonth={selectedMonth} />}
              activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 3 }}
            />
            <Line 
              type="monotone" 
              yAxisId="cotizado"
              dataKey="impCotizado" 
              stroke="var(--text-muted)" 
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent absolute"></div>
          </div>
          <span className="text-scale-sm text-text-secondary">Facturado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 border-b-2 border-dashed border-text-muted"></div>
          <span className="text-scale-sm text-text-secondary">Cotizado</span>
        </div>
      </div>
    </div>
  )
}
