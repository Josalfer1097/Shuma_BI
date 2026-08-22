'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { CANALES, ETIQUETA_CANAL, Dimension, FilaMensual, FilaRanking } from '@/lib/ventas'

interface FilterBarProps {
  mensual: FilaMensual[];
  opcionesEntidad?: FilaRanking[];
  defaultAnio?: string | null;
  defaultMes?: string | null;
}

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

const DIMENSIONES_OPCIONES: { label: string, value: Dimension }[] = [
  { label: 'Cliente', value: 'cliente' },
  { label: 'Vendedor', value: 'vendedor' },
  { label: 'Producto', value: 'producto' },
]

export function FilterBar({ mensual, opcionesEntidad, defaultAnio, defaultMes }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const anioParam = searchParams.get('anio')
  const mesParam = searchParams.get('mes')
  const canalParam = searchParams.get('canal')
  const dimensionParam = searchParams.get('dimension') || 'cliente'
  const entidadParam = searchParams.get('entidad')

  const activeAnio = anioParam === 'Todos' ? 'Todos' : (anioParam || defaultAnio || 'Todos')
  const activeMes = mesParam === 'Todos' ? 'Todos' : (mesParam || defaultMes || 'Todos')

  // Combobox state
  const [entidadSearch, setEntidadSearch] = useState('')
  const [entidadOpen, setEntidadOpen] = useState(false)
  const [comboboxFocused, setComboboxFocused] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setEntidadOpen(false)
      }
    }
    if (entidadOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('touchstart', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [entidadOpen])

  useEffect(() => {
    if (entidadParam && opcionesEntidad) {
      const selected = opcionesEntidad.find(opt => opt.dimensionId === entidadParam)
      if (selected && !comboboxFocused) {
        setEntidadSearch(`${selected.nombre} (${selected.codigo})`)
      }
    } else if (!comboboxFocused) {
      setEntidadSearch('')
    }
  }, [entidadParam, opcionesEntidad, comboboxFocused])

  const normalizedSearch = entidadSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const filteredOpcionesEntidad = (opcionesEntidad || []).filter(opt => {
    if (!normalizedSearch) return true
    const nombre = (opt.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const codigo = (opt.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return nombre.includes(normalizedSearch) || codigo.includes(normalizedSearch)
  })

  const uniqueYears = Array.from(new Set(mensual.map(r => r.anio_mes.split('-')[0]))).sort().reverse()
  
  const validMonthsForYear = Array.from(new Set(
    mensual
      .filter(r => activeAnio === 'Todos' || r.anio_mes.startsWith(`${activeAnio}-`))
      .map(r => r.anio_mes.split('-')[1])
  )).sort()

  const handleAnioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.set('anio', 'Todos')
      params.set('mes', 'Todos')
    } else {
      params.set('anio', val)
      if (activeMes !== 'Todos') {
        const monthsInNewYear = new Set(
          mensual
            .filter(r => r.anio_mes.startsWith(`${val}-`))
            .map(r => r.anio_mes.split('-')[1])
        )
        if (!monthsInNewYear.has(activeMes)) {
          params.set('mes', 'Todos')
        } else if (!searchParams.has('mes')) {
          params.set('mes', activeMes)
        }
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.set('mes', 'Todos')
    } else {
      params.set('mes', val)
      if (activeAnio === 'Todos' && uniqueYears.length > 0) {
         params.set('anio', uniqueYears[0])
      } else if (activeAnio !== 'Todos' && !searchParams.has('anio')) {
         params.set('anio', activeAnio)
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleCanalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'Todos') {
      params.delete('canal')
    } else {
      params.set('canal', val)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleDimensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val === 'cliente') {
      params.delete('dimension')
    } else {
      params.set('dimension', val)
    }
    params.delete('entidad')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleEntidadChange = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === null) {
      params.delete('entidad')
    } else {
      params.set('entidad', id)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    setEntidadOpen(false)
    setComboboxFocused(false)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('anio', 'Todos')
    params.set('mes', 'Todos')
    params.delete('canal')
    params.delete('entidad')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const hasActiveFilters = activeAnio !== 'Todos' || activeMes !== 'Todos' || canalParam || entidadParam

  const selectBaseClasses = "w-full bg-bg-surface border rounded-lg px-3 min-h-[44px] text-scale-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors appearance-none"

  return (
    <div data-tour="filtros" className="mb-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        
        {/* Dimensión */}
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-text-muted font-medium">Dimensión</label>
          <div className="relative">
            <select
              value={dimensionParam}
              onChange={handleDimensionChange}
              className={`${selectBaseClasses} border-border`}
            >
              {DIMENSIONES_OPCIONES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Canal */}
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-text-muted font-medium">Canal</label>
          <div className="relative">
            <select
              value={canalParam || 'Todos'}
              onChange={handleCanalChange}
              className={`${selectBaseClasses} ${canalParam ? 'border-accent' : 'border-border'}`}
            >
              <option value="Todos">Todos</option>
              {CANALES.filter(c => c !== 'interno').map(c => (
                <option key={c} value={c}>{ETIQUETA_CANAL[c]}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-text-muted font-medium">Año</label>
          <div className="relative">
            <select
              value={activeAnio}
              onChange={handleAnioChange}
              className={`${selectBaseClasses} ${activeAnio !== 'Todos' ? 'border-accent' : 'border-border'}`}
            >
              <option value="Todos">Todos</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Mes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-text-muted font-medium">Mes</label>
          <div className="relative">
            <select
              value={activeMes}
              onChange={handleMesChange}
              className={`${selectBaseClasses} ${activeMes !== 'Todos' ? 'border-accent' : 'border-border'}`}
            >
              <option value="Todos">Todos</option>
              {validMonthsForYear.map(m => (
                <option key={m} value={m}>{MONTHS_ES[m] || m}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Entidad (Cliente/Vendedor) */}
        {dimensionParam !== 'producto' && (
          <div className="flex flex-col gap-1 z-50">
            <label className="text-xs uppercase tracking-wide text-text-muted font-medium">
              {dimensionParam === 'vendedor' ? 'Vendedor' : 'Cliente'}
            </label>
            <div className="relative w-full" ref={comboboxRef}>
              <input
                type="text"
                value={entidadSearch}
                onFocus={() => {
                  setEntidadOpen(true)
                  setComboboxFocused(true)
                  if (entidadParam) setEntidadSearch('')
                }}
                onBlur={() => {
                  setTimeout(() => setComboboxFocused(false), 200)
                }}
                onChange={(e) => {
                  setEntidadSearch(e.target.value)
                  setEntidadOpen(true)
                }}
                placeholder={`Todos`}
                className={`w-full bg-bg-surface border rounded-lg px-3 min-h-[44px] text-scale-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors ${entidadParam ? 'border-accent' : 'border-border'}`}
              />
              {entidadSearch && (
                <button 
                  onClick={() => {
                    setEntidadSearch('')
                    handleEntidadChange(null)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {!entidadSearch && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              )}
              
              {entidadOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-64 overflow-y-auto bg-bg-surface border border-border rounded-lg shadow-xl z-50">
                  <button
                    className="w-full text-left px-3 py-2 text-scale-sm text-text-primary hover:bg-bg-elevated border-b border-border transition-colors font-medium"
                    onMouseDown={() => handleEntidadChange(null)}
                  >
                    Todos
                  </button>
                  {filteredOpcionesEntidad.length === 0 ? (
                    <div className="px-3 py-4 text-center text-scale-sm text-text-muted">
                      No se encontraron resultados
                    </div>
                  ) : (
                    filteredOpcionesEntidad.map(opt => (
                      <button
                        key={opt.dimensionId}
                        className="w-full text-left px-3 py-2 text-scale-sm hover:bg-bg-elevated transition-colors"
                        onMouseDown={() => handleEntidadChange(opt.dimensionId)}
                      >
                        <div className="flex flex-col">
                          <span className="text-text-primary truncate">{opt.nombre}</span>
                          <span className="text-scale-xs text-text-muted truncate">{opt.codigo}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Limpiar todo */}
        {hasActiveFilters && (
          <div className="flex flex-col gap-1 justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 min-h-[44px] w-full text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-colors text-scale-sm font-medium"
            >
              Limpiar todo
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
