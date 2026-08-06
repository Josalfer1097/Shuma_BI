'use client'

import React, { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ReporteRow } from '@/lib/types'
import { aggregate } from '@/lib/aggregate'
import { FilterBar } from './FilterBar'
import { KpiRow } from './KpiRow'
import { TrendChart } from './TrendChart'
import { ZoneRanking } from './ZoneRanking'
import { DetailTable } from './DetailTable'
import { Glossary } from './Glossary'
import { StagesChart } from './StagesChart'
import { StagesEvolutionChart } from './StagesEvolutionChart'
import { AuthTypesPanel } from './AuthTypesPanel'
import { KpiDescriptions } from './KpiDescriptions'

interface DashboardProps {
  initialData: ReporteRow[];
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

export function Dashboard({ initialData }: DashboardProps) {
  const searchParams = useSearchParams()
  const zoneParam = searchParams.get('zona')
  const anioParam = searchParams.get('anio')
  const mesParam = searchParams.get('mes')

  const validZones = new Set(initialData.map(r => r.zona))
  const validYears = new Set(initialData.map(r => r.anio_mes.split('-')[0]))
  const validMonths = new Set(initialData.map(r => r.anio_mes.split('-')[1]))
  
  // If invalid params are passed, fallback to 'Todos' by ignoring it
  const activeZone = zoneParam && validZones.has(zoneParam) ? zoneParam : null
  const activeAnio = anioParam && validYears.has(anioParam) ? anioParam : null
  const activeMes = mesParam && validMonths.has(mesParam) ? mesParam : null

  const filteredData = useMemo(() => {
    return initialData.filter(row => {
      const [anio, mes] = row.anio_mes.split('-')
      const pasaZona = !activeZone || row.zona === activeZone
      const pasaAnio = !activeAnio || anio === activeAnio
      const pasaMes  = !activeMes  || mes  === activeMes
      return pasaZona && pasaAnio && pasaMes
    })
  }, [initialData, activeZone, activeAnio, activeMes])

  const metrics = useMemo(() => aggregate(filteredData), [filteredData])

  // Aggregate trend data (group by anio_mes)
  const trendData = useMemo(() => {
    // Trend should ONLY be filtered by zone, NOT by month/year.
    const baseForTrend = initialData.filter(row => {
      return !activeZone || row.zona === activeZone
    })

    const byMonth = new Map<string, ReporteRow[]>()
    for (const row of baseForTrend) {
      const existing = byMonth.get(row.anio_mes) || []
      existing.push(row)
      byMonth.set(row.anio_mes, existing)
    }

    let aggregated = Array.from(byMonth.entries())
      .map(([anio_mes, rows]) => {
        const agg = aggregate(rows)
        return {
          anio_mes,
          mediana_dias: agg?.mediana_dias || 0,
          promedio_dias: agg?.promedio_dias || 0,
          total: agg?.total || 0,
          metrics: agg,
        }
      })
      .sort((a, b) => a.anio_mes.localeCompare(b.anio_mes))
      
    if (activeAnio && activeMes) {
      const selectedAnioMes = `${activeAnio}-${activeMes}`
      const idx = aggregated.findIndex(d => d.anio_mes === selectedAnioMes)
      if (idx !== -1) {
        const startIdx = Math.max(0, idx - 11)
        aggregated = aggregated.slice(startIdx, idx + 1)
      }
    }
    return aggregated
  }, [initialData, activeZone, activeAnio, activeMes])

  // Aggregate stages evolution data
  const stagesEvolutionData = useMemo(() => {
    const baseData = initialData.filter(row => {
      return !activeZone || row.zona === activeZone
    })

    const byMonth = new Map<string, ReporteRow[]>()
    for (const row of baseData) {
      const existing = byMonth.get(row.anio_mes) || []
      existing.push(row)
      byMonth.set(row.anio_mes, existing)
    }

    let aggregated = Array.from(byMonth.entries())
      .map(([anio_mes, rows]) => {
        const sumTotal = rows.reduce((s, r) => s + r.total, 0)
        return {
          anio_mes,
          autorizacion: sumTotal ? rows.reduce((s, r) => s + (r.med_cot_autorizacion ?? 0) * r.total, 0) / sumTotal : 0,
          a_recepcion: sumTotal ? rows.reduce((s, r) => s + (r.med_autorizacion_recepcion ?? 0) * r.total, 0) / sumTotal : 0,
          surtido: sumTotal ? rows.reduce((s, r) => s + (r.med_recepcion_surtido ?? 0) * r.total, 0) / sumTotal : 0,
          a_ruta: sumTotal ? rows.reduce((s, r) => s + (r.med_surtido_ruta ?? 0) * r.total, 0) / sumTotal : 0,
          entrega: sumTotal ? rows.reduce((s, r) => s + (r.med_ruta_entrega ?? 0) * r.total, 0) / sumTotal : 0,
          validacion: sumTotal ? rows.reduce((s, r) => s + (r.med_entrega_validacion ?? 0) * r.total, 0) / sumTotal : 0,
        }
      })
      .sort((a, b) => a.anio_mes.localeCompare(b.anio_mes))
      
    if (activeAnio && activeMes) {
      const selectedAnioMes = `${activeAnio}-${activeMes}`
      const idx = aggregated.findIndex(d => d.anio_mes === selectedAnioMes)
      if (idx !== -1) {
        const startIdx = Math.max(0, idx - 11)
        aggregated = aggregated.slice(startIdx, idx + 1)
      }
    }

    return aggregated
  }, [initialData, activeZone, activeAnio, activeMes])

  // Aggregate zone ranking data (group by zona)
  const zoneData = useMemo(() => {
    // Zone ranking ALWAYS uses the initial data filtered ONLY by months/years, not by zone.
    const baseData = initialData.filter(row => {
      const [anio, mes] = row.anio_mes.split('-')
      const pasaAnio = !activeAnio || anio === activeAnio
      const pasaMes  = !activeMes  || mes  === activeMes
      return pasaAnio && pasaMes
    })

    const byZone = new Map<string, ReporteRow[]>()
    for (const row of baseData) {
      const existing = byZone.get(row.zona) || []
      existing.push(row)
      byZone.set(row.zona, existing)
    }

    return Array.from(byZone.entries())
      .map(([zona, rows]) => {
        const agg = aggregate(rows)
        return {
          zona,
          mediana_dias: agg?.mediana_dias || 0,
          promedio_dias: agg?.promedio_dias || 0,
          total: agg?.total || 0,
        }
      })
      .sort((a, b) => b.mediana_dias - a.mediana_dias)
  }, [initialData, activeAnio, activeMes])

  let periodoLabel = 'Todos los periodos'
  if (activeAnio && activeMes) {
    periodoLabel = `${MONTHS_ES[activeMes]} ${activeAnio}`
  } else if (activeAnio) {
    periodoLabel = activeAnio
  } else if (activeMes) {
    periodoLabel = `${MONTHS_ES[activeMes]} (todos los años)`
  }

  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const maxAnioMes = initialData.reduce((max, row) => row.anio_mes > max ? row.anio_mes : max, '')
  const partialMonth = maxAnioMes === currentYearMonth ? maxAnioMes : null

  return (
    <div>
      <div data-tour="filtros">
        <FilterBar rawData={initialData} />
      </div>
      <div className="mb-4">
        <span className="text-scale-sm text-text-muted">{periodoLabel}</span>
      </div>
      <div data-tour="kpis">
        <KpiRow metrics={metrics} />
      </div>

      <div data-tour="etapas">
        <StagesChart metrics={metrics} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div data-tour="tendencia">
        <TrendChart data={trendData} selectedMonth={activeAnio && activeMes ? `${activeAnio}-${activeMes}` : null} partialMonth={partialMonth} />
        </div>
        <ZoneRanking data={zoneData} />
      </div>
      
      <StagesEvolutionChart data={stagesEvolutionData} partialMonth={partialMonth} />

      <AuthTypesPanel metrics={metrics} />

      <DetailTable data={filteredData} partialMonth={partialMonth} />
      
      <KpiDescriptions />
      <Glossary />
    </div>
  )
}
