'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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
import { Tooltip as CustomUITooltip } from '../ui/Tooltip'
import { Select } from '../ui/Select'
import { DashboardMetrics } from '@/lib/types'
import { useEmpresa } from '@/lib/empresaContext'
import { useFontScale } from '@/lib/fontScaleContext'

interface TrendChartProps {
  data: {
    anio_mes: string;
    mediana_dias: number;
    promedio_dias: number;
    total: number;
    metrics?: DashboardMetrics | null;
  }[];
  /** Valor de data-tour para el recorrido guiado. */
  anclaTour?: string;
  selectedMonth?: string | null;
  partialMonth?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, partialMonth }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const meetsMeta = data.mediana_dias <= payload[0].payload.metaDias
    const isAnomaly = data.promedio_dias > data.mediana_dias * 2
    const isPartial = partialMonth === data.anio_mes
    
    return (
      <div className="bg-bg-elevated border border-border rounded shadow-lg p-3 text-scale-sm max-w-[280px] z-[60]">
        <p className="text-text-muted mb-2 font-medium">{label}</p>
        
        {isPartial && (
          <div className="mb-3 px-2 py-1.5 bg-warning/10 text-warning text-scale-xs font-medium rounded border border-warning/20">
            Datos parciales del mes en curso.
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-accent">Mediana:</span> 
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatDecimal(data.mediana_dias)}d</span>
              {meetsMeta ? (
                <span className="text-success text-scale-xs">✓ dentro de meta</span>
              ) : (
                <span className="text-danger text-scale-xs">✗ fuera de meta</span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-text-secondary">Promedio:</span> 
            <span className="font-semibold">{formatDecimal(data.promedio_dias)}d</span>
          </div>
          <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-border mt-1.5">
            <span className="text-text-primary">Volumen:</span> 
            <span className="font-semibold">{formatNumber(data.total)} entregas</span>
          </div>
        </div>
        
        {isAnomaly && (
          <div className="mt-3 pt-3 border-t border-border text-scale-xs text-text-muted leading-relaxed">
            <strong className="text-warning font-semibold">Anomalía:</strong> Ese mes el promedio se disparó por unas pocas entregas muy lentas. La mediana casi no cambió, así que el proceso general no empeoró: fueron casos aislados.
          </div>
        )}
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
  const { cx, cy, payload, selectedMonth, partialMonth } = props;
  const isSelected = selectedMonth === payload.anio_mes;
  const isPartial = partialMonth === payload.anio_mes;
  if (isSelected) {
    return (
      <circle cx={cx} cy={cy} r={6} fill="var(--warning)" stroke="var(--bg-surface)" strokeWidth={2} />
    );
  }
  if (isPartial) {
    return (
      <circle cx={cx} cy={cy} r={5} fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth={2} strokeDasharray="2 2" />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill="var(--accent)" strokeWidth={0} />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PromedioDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.promedio_dias > payload.mediana_dias * 2) {
    return (
      <polygon points={`${cx},${cy-6} ${cx-5},${cy+4} ${cx+5},${cy+4}`} fill="var(--warning)" />
    );
  }
  return null;
}

export function TrendChart({ data, selectedMonth, partialMonth, anclaTour }: TrendChartProps) {
  const router = useRouter()
  // Ruta actual en vez de '/' escrito a mano: el modulo puede vivir en
  // cualquier ruta y los filtros deben quedarse dentro de ella.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const compMode = searchParams.get('comp') || 'anterior'
  const { scale } = useFontScale()
  const { metaDias } = useEmpresa()

  // Inject metaDias into data for tooltip access
  const dataWithMeta = data.map(d => ({ ...d, metaDias }))

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 h-60 sm:h-80 flex items-center justify-center">
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

  let comparisonNode = null;
  let chartTitle = "Tendencia mensual";
  let chartTooltip = "La línea sólida es la mediana: lo que tarda una entrega típica. La punteada es el promedio, que sube cuando hay entregas muy lentas. Cuando las dos líneas se separan, ese mes hubo casos extremos. Si el promedio sube pero la mediana se mantiene, el problema son casos aislados y no el proceso general.";

  const sumTotalVisible = dataWithMeta.reduce((acc, d) => acc + d.total, 0);
  const tuNormal = sumTotalVisible > 0 ? dataWithMeta.reduce((acc, d) => acc + d.mediana_dias * d.total, 0) / sumTotalVisible : 0;

  if (selectedMonth) {
    const [anio, mes] = selectedMonth.split('-')
    const label = `${MONTHS_ES[mes] || mes} ${anio}`
    chartTitle = `Tendencia mensual — ${label} en contexto`;
    chartTooltip = "Se muestran los últimos doce meses para poder ubicar el mes seleccionado en contexto. El punto resaltado es el mes que elegiste. Un mes aislado no dice mucho: lo que importa es si está por encima o por debajo de su tendencia.";

    // Compare logic
    const current = dataWithMeta[dataWithMeta.length - 1];
    let prev = null;
    let pLabel = '';

    if (compMode === 'anterior') {
      if (dataWithMeta.length > 1) {
        prev = dataWithMeta[dataWithMeta.length - 2];
        const [pAnio, pMes] = prev.anio_mes.split('-');
        pLabel = `${MONTHS_ES[pMes] || pMes} ${pAnio}`;
      }
    } else if (compMode === 'anual') {
      if (dataWithMeta.length > 12) {
        prev = dataWithMeta[dataWithMeta.length - 13];
        const [pAnio, pMes] = prev.anio_mes.split('-');
        pLabel = `${MONTHS_ES[pMes] || pMes} ${pAnio}`;
      }
    } else if (compMode === 'promedio') {
      if (dataWithMeta.length > 1) {
        // Average of ALL visible data up to this point
        const sumTotal = dataWithMeta.reduce((acc, d) => acc + d.total, 0);
        const avgMediana = sumTotal > 0 ? dataWithMeta.reduce((acc, d) => acc + d.mediana_dias * d.total, 0) / sumTotal : 0;
        const avgTotal = sumTotal / dataWithMeta.length;
        
        const avgMetrics = {} as DashboardMetrics;
        const stages = ['med_cot_autorizacion', 'med_autorizacion_recepcion', 'med_recepcion_surtido', 'med_surtido_ruta', 'med_ruta_entrega', 'med_entrega_validacion'];
        stages.forEach(s => {
          // @ts-expect-error type index
          avgMetrics[s] = sumTotal > 0 ? dataWithMeta.reduce((acc, d) => acc + (d.metrics?.[s] || 0) * d.total, 0) / sumTotal : 0;
        });

        prev = {
          anio_mes: 'Promedio',
          mediana_dias: avgMediana,
          promedio_dias: 0,
          total: avgTotal,
          metrics: avgMetrics
        };
        pLabel = 'promedio del periodo';
      }
    }

    if (!prev) {
      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-3 mb-4 flex justify-center text-scale-sm text-text-muted">
          sin dato para comparar
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

      comparisonNode = (
        <div className="bg-bg-elevated/30 border border-border rounded p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="flex flex-col gap-1 px-2">
            <span className="text-text-muted text-scale-xs">Tiempo típico (mediana)</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-scale-xl font-semibold leading-none mb-1.5">{formatDecimal(current.mediana_dias)}d</span>
              <span className="text-scale-xs font-medium">{formatDiff(diffMediana, percMediana, "d", true)} <span className="text-text-muted opacity-70 font-normal">vs {pLabel}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-2 sm:pl-4">
            <span className="text-text-muted text-scale-xs">Volumen de entregas</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-scale-xl font-semibold leading-none mb-1.5">{formatNumber(current.total)}</span>
              <span className="text-scale-xs font-medium">{formatDiff(diffVolumen, percVolumen, "", false)} <span className="text-text-muted opacity-70 font-normal">vs {pLabel}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-2 sm:pl-4">
            <span className="text-text-muted text-scale-xs">Etapa más lenta</span>
            <div className="flex flex-col items-start mt-1">
              <span className="text-text-primary text-scale-xl font-semibold leading-none mb-1.5 truncate" title={currSlowest?.label}>{currSlowest?.label || 'N/A'}</span>
              <span className="text-text-secondary font-medium text-scale-xs">{currSlowest ? `${formatDecimal(currSlowest.value)}d` : ''}</span>
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
          {!selectedMonth && <p className="text-text-muted text-scale-sm mt-0.5">¿Estamos mejorando o empeorando mes a mes?</p>}
        </div>
        <div className="flex items-center gap-3">
          {selectedMonth && (
            <Select 
              value={compMode} 
              onChange={handleCompChange} 
              options={[
                { label: 'Mes anterior', value: 'anterior' },
                { label: 'Mismo mes año pasado', value: 'anual' },
                { label: 'Promedio del periodo', value: 'promedio' }
              ]}
              className="py-1 text-scale-xs sm:min-h-[32px] pr-8"
            />
          )}
          <CustomUITooltip text={chartTooltip} />
        </div>
      </div>
      
      {comparisonNode}

      {/* Altura definida, no min-height: ResponsiveContainer usa height="100%"
          y un porcentaje no resuelve contra una altura automatica. Con
          min-height el area de dibujo colapsaba a cero. */}
      {/* Sin flex-1: flex-basis 0% reemplaza a height en un contenedor de
          columna y el area de dibujo colapsa. Con flex-1 la grafica solo se
          veia cuando la rejilla le daba altura desde afuera, asi que dejaba
          de dibujarse en cuanto quedaba sola en su fila. */}
      <div className="w-full" style={{ height: Math.max(240, 320 * scale) }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithMeta} margin={{ top: 5, right: 30, left: Math.round(-20 + (scale - 1) * -10), bottom: Math.round(5 + (scale - 1) * 15) }}>
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
              domain={[0, (dataMax: number) => Math.max(6, Math.ceil(dataMax * 1.1))]}
              label={{ value: 'Días', angle: -90, position: 'insideLeft', offset: Math.round(10 * scale), style: { fill: 'var(--text-muted)', fontSize: Math.round(11 * scale) } }}
            />
            
            <ReferenceLine y={tuNormal} stroke="var(--text-muted)" strokeWidth={1} strokeOpacity={0.3} label={{ value: `Tu normal: ${formatDecimal(tuNormal)}d`, position: 'insideTopLeft', fill: 'var(--text-muted)', fontSize: Math.round(10 * scale) }} />
            <ReferenceLine y={metaDias} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5} strokeWidth={1} label={{ value: `Meta: ${metaDias}d`, position: 'right', fill: 'var(--danger)', fontSize: Math.round(11 * scale) }} />
            
            {selectedMonth && (
              <ReferenceLine x={selectedMonth} stroke="var(--warning)" strokeDasharray="3 3" />
            )}
            
            <RechartsTooltip 
              content={<CustomTooltip partialMonth={partialMonth} />} 
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} 
              trigger="click"
            />
            <Line 
              type="monotone" 
              dataKey="mediana_dias" 
              stroke="var(--accent)" 
              strokeWidth={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => <CustomDot {...props} selectedMonth={selectedMonth} partialMonth={partialMonth} />}
              activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="promedio_dias" 
              stroke="var(--text-muted)" 
              strokeWidth={2}
              strokeDasharray="4 4"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => <PromedioDot {...props} />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent absolute"></div>
          </div>
          <span className="text-scale-sm text-text-secondary">Mediana (caso típico)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 border-b-2 border-dashed border-text-muted"></div>
          <span className="text-scale-sm text-text-secondary">Promedio</span>
        </div>
      </div>
    </div>
  )
}
