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

export function Dashboard({ initialData }: DashboardProps) {
  const searchParams = useSearchParams()
  const zoneParam = searchParams.get('zona')
  const monthsParam = searchParams.get('rango')

  const validZones = new Set(initialData.map(r => r.zona))
  
  // If invalid zone is passed, fallback to 'Todas' by ignoring it
  const activeZone = zoneParam && validZones.has(zoneParam) ? zoneParam : null

  const filteredData = useMemo(() => {
    let data = initialData

    if (activeZone) {
      data = data.filter(r => r.zona === activeZone)
    }

    if (monthsParam && monthsParam !== 'Todo') {
      const monthsCount = parseInt(monthsParam, 10)
      if (!isNaN(monthsCount)) {
        const uniqueMonths = Array.from(new Set(initialData.map(r => r.anio_mes))).sort().reverse()
        const selectedMonths = new Set(uniqueMonths.slice(0, monthsCount))
        data = data.filter(r => selectedMonths.has(r.anio_mes))
      }
    }

    return data
  }, [initialData, activeZone, monthsParam])

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
    // If a zone is selected, we still want to show all zones in the ranking, but highlight it.
    // Wait, the prompt says "Cuando hay una zona seleccionada, sigue mostrando las 14 barras".
    // Therefore, the zone ranking should ALWAYS use the initial data filtered ONLY by months, not by zone.
    
    let baseData = initialData
    if (monthsParam && monthsParam !== 'Todo') {
      const monthsCount = parseInt(monthsParam, 10)
      if (!isNaN(monthsCount)) {
        const uniqueMonths = Array.from(new Set(initialData.map(r => r.anio_mes))).sort().reverse()
        const selectedMonths = new Set(uniqueMonths.slice(0, monthsCount))
        baseData = baseData.filter(r => selectedMonths.has(r.anio_mes))
      }
    }

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
  }, [initialData, monthsParam])

  const selectedZonesCount = new Set(filteredData.map(r => r.zona)).size
  const selectedMonthsCount = new Set(filteredData.map(r => r.anio_mes)).size

  return (
    <div>
      <FilterBar rawData={initialData} />
      <KpiRow metrics={metrics} selectedZonesCount={selectedZonesCount} selectedMonthsCount={selectedMonthsCount} />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <TrendChart data={trendData} />
        <ZoneRanking data={zoneData} />
      </div>

      <DetailTable data={filteredData} />
    </div>
  )
}
