'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from './ui/Select'
import { ReporteRow } from '@/lib/types'
import { X } from 'lucide-react'

interface FilterBarProps {
  rawData: ReporteRow[];
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

export function FilterBar({ rawData }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const zoneParam = searchParams.get('zona')
  const anioParam = searchParams.get('anio')
  const mesParam = searchParams.get('mes')

  const uniqueZones = Array.from(new Set(rawData.map(r => r.zona))).sort()
  const uniqueYears = Array.from(new Set(rawData.map(r => r.anio_mes.split('-')[0]))).sort().reverse()
  
  const validMonthsForYear = Array.from(new Set(
    rawData
      .filter(r => !anioParam || r.anio_mes.startsWith(`${anioParam}-`))
      .map(r => r.anio_mes.split('-')[1])
  )).sort()

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todas') {
      params.delete('zona')
    } else {
      params.set('zona', val)
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const handleAnioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.delete('anio')
    } else {
      params.set('anio', val)
    }

    if (val !== 'Todos' && mesParam) {
      const monthsInNewYear = new Set(
        rawData
          .filter(r => r.anio_mes.startsWith(`${val}-`))
          .map(r => r.anio_mes.split('-')[1])
      )
      if (!monthsInNewYear.has(mesParam)) {
        params.delete('mes')
      }
    }

    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.delete('mes')
    } else {
      params.set('mes', val)
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const clearFilters = () => {
    router.push('/', { scroll: false })
  }

  const hasFilters = zoneParam || anioParam || mesParam

  return (
    <div className="sticky top-0 z-40 bg-bg-base/90 backdrop-blur-md py-4 border-b border-border mb-8 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-sm whitespace-nowrap">Zona:</span>
        <Select
          className="w-full sm:w-48"
          value={zoneParam || 'Todas'}
          onChange={handleZoneChange}
          options={[
            { label: 'Todas', value: 'Todas' },
            ...uniqueZones.map(z => ({ label: z, value: z }))
          ]}
        />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-sm whitespace-nowrap">Año:</span>
        <Select
          className="w-full sm:w-32"
          value={anioParam || 'Todos'}
          onChange={handleAnioChange}
          options={[
            { label: 'Todos', value: 'Todos' },
            ...uniqueYears.map(y => ({ label: y, value: y }))
          ]}
        />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-sm whitespace-nowrap">Mes:</span>
        <Select
          className="w-full sm:w-40"
          value={mesParam || 'Todos'}
          onChange={handleMesChange}
          options={[
            { label: 'Todos', value: 'Todos' },
            ...validMonthsForYear.map(m => ({ label: MONTHS_ES[m] || m, value: m }))
          ]}
        />
      </div>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto text-sm text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
