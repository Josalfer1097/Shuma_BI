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
    const byMonth = new Map<string, ReporteRow[]>()
    for (const row of filteredData) {
      const existing = byMonth.get(row.anio_mes) || []
      existing.push(row)
      byMonth.set(row.anio_mes, existing)
    }

    return Array.from(byMonth.entries())
      .map(([anio_mes, rows]) => {
        const agg = aggregate(rows)
        return {
          anio_mes,
          mediana_dias: agg?.mediana_dias || 0,
          promedio_dias: agg?.promedio_dias || 0,
          total: agg?.total || 0,
        }
      })
      .sort((a, b) => a.anio_mes.localeCompare(b.anio_mes))
  }, [filteredData])

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

  const selectedZonesCount = new Set(filteredData.map(r => r.zona)).size
  const selectedMonthsCount = new Set(filteredData.map(r => r.anio_mes)).size

  let periodoLabel = 'Todos los periodos'
  if (activeAnio && activeMes) {
    periodoLabel = `${MONTHS_ES[activeMes]} ${activeAnio}`
  } else if (activeAnio) {
    periodoLabel = activeAnio
  } else if (activeMes) {
    periodoLabel = `${MONTHS_ES[activeMes]} (todos los años)`
  }

  return (
    <div>
      <FilterBar rawData={initialData} />
      <div className="mb-4">
        <span className="text-sm text-text-muted">{periodoLabel}</span>
      </div>
      <KpiRow metrics={metrics} selectedZonesCount={selectedZonesCount} selectedMonthsCount={selectedMonthsCount} />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <TrendChart data={trendData} />
        <ZoneRanking data={zoneData} />
      </div>

      <DetailTable data={filteredData} />
    </div>
  )
}
