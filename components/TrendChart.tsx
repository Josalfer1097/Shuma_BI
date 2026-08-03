'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { formatNumber, formatDecimal } from '@/lib/format'
import { Tooltip as CustomUITooltip } from './ui/Tooltip'
import { DashboardMetrics } from '@/lib/types'

interface TrendChartProps {
  data: {
    anio_mes: string;
    mediana_dias: number;
    promedio_dias: number;
    total: number;
    metrics?: DashboardMetrics | null;
  }[];
  selectedMonth?: string | null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload, selectedMonth } = props;
  const isSelected = selectedMonth === payload.anio_mes;
  if (isSelected) {
    return (
      <circle cx={cx} cy={cy} r={6} fill="var(--warning)" stroke="var(--bg-surface)" strokeWidth={2} />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="var(--accent)" strokeWidth={0} />;
};

export function TrendChart({ data, selectedMonth }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center">
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

  let comparisonNode = null;
  let chartTitle = "Tendencia mensual";
  let chartTooltip = "La linea solida es la mediana: lo que tarda una entrega tipica. La punteada es el promedio, que sube cuando hay entregas muy lentas. Cuando las dos lineas se separan, ese mes hubo casos extremos. Si el promedio sube pero la mediana se mantiene, el problema son casos aislados y no el proceso general.";

  if (selectedMonth) {
    const [anio, mes] = selectedMonth.split('-')
    const label = `${MONTHS_ES[mes] || mes} ${anio}`
    chartTitle = `Tendencia mensual — ${label} en contexto`;
    chartTooltip = "Se muestran los ultimos doce meses para poder ubicar el mes seleccionado en contexto. El punto resaltado es el mes que elegiste. Un mes aislado no dice mucho: lo que importa es si esta por encima o por debajo de su tendencia.";

    // Compare with previous month
    const current = data[data.length - 1];
    const prev = data.length > 1 ? data[data.length - 2] : null;

    if (!prev) {
      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-3 mb-4 flex justify-center text-sm text-text-muted">
          sin mes previo para comparar
        </div>
      );
    } else {
      const diffMediana = current.mediana_dias - prev.mediana_dias;
      const percMediana = prev.mediana_dias > 0 ? (Math.abs(diffMediana) / prev.mediana_dias) * 100 : 0;
      
      const diffVolumen = current.total - prev.total;
      const percVolumen = prev.total > 0 ? (Math.abs(diffVolumen) / prev.total) * 100 : 0;

      const getSlowest = (metrics: DashboardMetrics | null | undefined) => {
        if (!metrics) return null;
        const stages = [
          { label: 'Autorizacion', value: metrics.med_cot_autorizacion },
          { label: 'A recepcion', value: metrics.med_autorizacion_recepcion },
          { label: 'Surtido', value: metrics.med_recepcion_surtido },
          { label: 'A ruta', value: metrics.med_surtido_ruta },
          { label: 'Entrega', value: metrics.med_ruta_entrega },
          { label: 'Validacion', value: metrics.med_entrega_validacion },
        ].filter(s => s.value !== null && s.value > 0) as { label: string; value: number }[];
        if (stages.length === 0) return null;
        return stages.reduce((p, c) => (p.value > c.value) ? p : c, stages[0]);
      };

      const currSlowest = getSlowest(current.metrics);

      const formatDiff = (diff: number, perc: number, unit: string, isTime: boolean) => {
        const isUp = diff > 0;
        const isDown = diff < 0;
        
        let colorClass = "text-text-muted";
        if (isTime) {
          if (isUp) colorClass = "text-danger";
          if (isDown) colorClass = "text-success";
        } else {
          if (isUp) colorClass = "text-success";
          if (isDown) colorClass = "text-danger";
        }

        const arrow = isUp ? "▲" : isDown ? "▼" : "—";
        const sign = isUp ? "+" : isDown ? "-" : "";
        const formattedDiff = isTime ? formatDecimal(Math.abs(diff)) : formatNumber(Math.abs(diff));
        const formattedPerc = formatDecimal(perc);
        
        return (
          <span className={colorClass}>
            {arrow} {formattedDiff}{unit} ({sign}{formattedPerc}%)
          </span>
        );
      };

      const [pAnio, pMes] = prev.anio_mes.split('-');
      const pLabel = `${MONTHS_ES[pMes] || pMes} ${pAnio}`;

      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="flex flex-col gap-1 px-2">
            <span className="text-text-muted text-xs">Tiempo tipico (mediana)</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-xl font-semibold leading-none mb-1.5">{formatDecimal(current.mediana_dias)}d</span>
              <span className="text-xs font-medium">{formatDiff(diffMediana, percMediana, "d", true)} <span className="text-text-muted opacity-70 font-normal">vs {pLabel}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-2 sm:pl-4">
            <span className="text-text-muted text-xs">Volumen de entregas</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-xl font-semibold leading-none mb-1.5">{formatNumber(current.total)}</span>
              <span className="text-xs font-medium">{formatDiff(diffVolumen, percVolumen, "", false)} <span className="text-text-muted opacity-70 font-normal">vs {pLabel}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-2 sm:pl-4">
            <span className="text-text-muted text-xs">Etapa mas lenta</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-xl font-semibold leading-none mb-1.5 truncate" title={currSlowest?.label}>{currSlowest?.label || 'N/A'}</span>
              <span className="text-text-secondary font-medium text-xs">{currSlowest ? `${formatDecimal(currSlowest.value)}d` : ''}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mb-8 flex flex-col">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-text-primary font-medium">{chartTitle}</h3>
          {!selectedMonth && <p className="text-text-muted text-sm mt-0.5">¿Estamos mejorando o empeorando mes a mes?</p>}
        </div>
        <CustomUITooltip text={chartTooltip} />
      </div>

      {comparisonNode}

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
            {selectedMonth && (
              <ReferenceLine x={selectedMonth} stroke="var(--warning)" strokeDasharray="3 3" />
            )}
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => <CustomDot {...props} selectedMonth={selectedMonth} />}
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
