'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from './ui/Select'
import { ReporteRow } from '@/lib/types'
import { X } from 'lucide-react'

interface FilterBarProps {
  rawData: ReporteRow[];
}

export function FilterBar({ rawData }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const zoneParams = searchParams.get('zona')
  const monthsParams = searchParams.get('rango')

  const uniqueZones = Array.from(new Set(rawData.map(r => r.zona))).sort()

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

  const handleMonthsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todo') {
      params.delete('rango')
    } else {
      params.set('rango', val)
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const clearFilters = () => {
    router.push('/', { scroll: false })
  }

  const hasFilters = zoneParams || monthsParams

  return (
    <div className="sticky top-0 z-40 bg-bg-base/90 backdrop-blur-md py-4 border-b border-border mb-8 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-sm whitespace-nowrap">Zona:</span>
        <Select
          className="w-full sm:w-48"
          value={zoneParams || 'Todas'}
          onChange={handleZoneChange}
          options={[
            { label: 'Todas', value: 'Todas' },
            ...uniqueZones.map(z => ({ label: z, value: z }))
          ]}
        />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-sm whitespace-nowrap">Meses:</span>
        <Select
          className="w-full sm:w-48"
          value={monthsParams || 'Todo'}
          onChange={handleMonthsChange}
          options={[
            { label: 'Todo', value: 'Todo' },
            { label: 'Últimos 3 meses', value: '3' },
            { label: 'Últimos 6 meses', value: '6' },
            { label: 'Últimos 12 meses', value: '12' },
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
