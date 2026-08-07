'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Select } from '../ui/Select'
import { ReporteRow } from '@/lib/types'
import { X, Filter } from 'lucide-react'
import { useEmpresa } from '@/lib/empresaContext'

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
  // Ruta actual en vez de '/' escrito a mano: el modulo puede vivir en
  // cualquier ruta y los filtros deben quedarse dentro de ella.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { usaZonas } = useEmpresa()

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [mobileMenuOpen])

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todas') {
      params.delete('zona')
    } else {
      params.set('zona', val)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    setMobileMenuOpen(false)
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

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    setMobileMenuOpen(false)
  }

  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.delete('mes')
    } else {
      params.set('mes', val)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    setMobileMenuOpen(false)
  }

  const clearFilters = () => {
    router.push(pathname, { scroll: false })
    setMobileMenuOpen(false)
  }

  const removeZone = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('zona')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const removeYear = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('anio')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const removeMonth = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('mes')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }


  const activeFiltersChips = []
  let activeCount = 0
  if (usaZonas && zoneParam) {
    activeFiltersChips.push(
      <button key="zona" onClick={removeZone} className="flex-shrink-0 flex items-center gap-1.5 bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20 rounded-full pl-3 pr-2 min-h-[44px] text-scale-sm whitespace-nowrap font-medium">
        {zoneParam}
        <span className="bg-accent/20 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></span>
      </button>
    )
    activeCount++
  }
  // Ano y mes van en etiquetas separadas, no fusionadas en una sola.
  // Fusionadas, quitar el mes obligaba a quitar tambien el ano y volver a
  // elegirlo. Son dos filtros independientes en la URL y deben poder
  // quitarse por separado.
  const chipClases =
    'flex-shrink-0 flex items-center gap-1.5 bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20 rounded-full pl-3 pr-2 min-h-[44px] text-scale-sm whitespace-nowrap font-medium'

  if (anioParam) {
    activeFiltersChips.push(
      <button key="anio" onClick={removeYear} aria-label={`Quitar el filtro de ano ${anioParam}`} className={chipClases}>
        {anioParam}
        <span className="bg-accent/20 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></span>
      </button>
    )
    activeCount++
  }
  if (mesParam) {
    activeFiltersChips.push(
      <button key="mes" onClick={removeMonth} aria-label={`Quitar el filtro de mes ${MONTHS_ES[mesParam]}`} className={chipClases}>
        {MONTHS_ES[mesParam]}
        <span className="bg-accent/20 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></span>
      </button>
    )
    activeCount++
  }
  if (activeCount >= 2) {
    activeFiltersChips.push(
      <button key="clear-all" onClick={clearFilters} className="flex-shrink-0 flex items-center gap-1.5 bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/30 rounded-full pl-3 pr-2 min-h-[44px] text-scale-sm whitespace-nowrap font-medium">
        Limpiar todo
        <X className="w-4 h-4" />
      </button>
    )
  }

  const selectsContent = (
    <>
      {usaZonas && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-text-muted text-scale-sm whitespace-nowrap">Zona:</span>
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
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-scale-sm whitespace-nowrap">Año:</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <span className="text-text-muted text-scale-sm whitespace-nowrap">Mes:</span>
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
      {/* On mobile, clear filters is shown as a chip if multiple are active */}
    </>
  )

  return (
    <div className="sticky top-0 z-40 bg-bg-base/90 backdrop-blur-md py-4 border-b border-border mb-8" ref={menuRef}>
      {/* Mobile view */}
      <div className="sm:hidden relative w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full custom-scrollbar">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex-shrink-0 flex items-center gap-2 bg-bg-surface border border-border rounded-full px-4 min-h-[44px] text-scale-sm text-text-primary font-medium"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          {activeFiltersChips}
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-elevated border border-border rounded-lg shadow-xl p-4 flex flex-col gap-4 z-50">
            {selectsContent}
          </div>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex flex-row items-center gap-4 w-full">
        {selectsContent}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            {activeFiltersChips}
          </div>
        )}
      </div>
    </div>
  )
}
