'use client'

import React, { useState } from 'react'
import { ReporteRow } from '@/lib/types'
import { formatNumber, formatDecimal } from '@/lib/format'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from './ui/Tooltip'
import { Select } from './ui/Select'

interface DetailTableProps {
  data: ReporteRow[];
}

type SortField = keyof ReporteRow
type SortDirection = 'asc' | 'desc'

const SORT_OPTIONS = [
  { label: 'Mes (Más reciente)', value: 'anio_mes-desc' },
  { label: 'Mes (Más antiguo)', value: 'anio_mes-asc' },
  { label: 'Zona (A-Z)', value: 'zona-asc' },
  { label: 'Zona (Z-A)', value: 'zona-desc' },
  { label: 'Entregas (Mayor a menor)', value: 'total-desc' },
  { label: 'Entregas (Menor a mayor)', value: 'total-asc' },
  { label: 'Mediana (Mayor a menor)', value: 'mediana_dias-desc' },
  { label: 'Mediana (Menor a mayor)', value: 'mediana_dias-asc' }
]

export function DetailTable({ data }: DetailTableProps) {
  const [sortField, setSortField] = useState<SortField>('anio_mes')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const rowsPerPage = 25

  if (data.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-5 h-40 flex items-center justify-center mt-8">
        <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
      </div>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setPage(1)
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    // Handle null values that could come from the new metrics
    if (aVal === null) aVal = 0
    if (bVal === null) bVal = 0

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const paginatedData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 text-text-muted opacity-50" />
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-accent" />
  }

  const Th = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'right' }) => (
    <th 
      className={cn("px-4 py-3 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap", align === 'right' ? 'text-right' : 'text-left')}
      onClick={() => handleSort(field)}
    >
      <div className={cn("flex items-center gap-1", align === 'right' && 'justify-end')}>
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  )

  return (
    <div className="bg-bg-surface border border-border rounded-lg mt-8 overflow-hidden">
      
      {/* Mobile view */}
      <div className="block sm:hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-text-muted text-sm whitespace-nowrap">Ordenar:</span>
          <Select 
            className="w-full"
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-') as [SortField, SortDirection]
              setSortField(field)
              setSortDirection(dir)
              setPage(1)
            }}
            options={SORT_OPTIONS}
          />
        </div>
        <div className="flex flex-col gap-4">
          {paginatedData.map((row) => {
            return (
              <div key={`${row.anio_mes}-${row.zona}`} className="bg-bg-elevated border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                  <span className="font-medium text-text-primary">{row.anio_mes}</span>
                  <span className="text-sm text-text-secondary font-medium">{row.zona}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <div className="flex flex-col">
                    <span className="text-text-muted text-xs mb-1">Entregas</span>
                    <span className="font-medium text-text-primary tabular-nums">{formatNumber(row.total)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text-muted text-xs mb-1">Mediana</span>
                    <span className="font-medium text-text-primary tabular-nums">{formatDecimal(row.mediana_dias)}d</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text-muted text-xs mb-1">Promedio</span>
                    <span className="font-medium text-text-muted tabular-nums">{formatDecimal(row.promedio_dias)}d</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg-elevated/50">
              <Th field="anio_mes" label="Mes" />
              <Th field="zona" label="Zona" />
              <Th field="total" label="Entregas" align="right" />
              <Th field="mediana_dias" label="Mediana" align="right" />
              <Th field="promedio_dias" label="Promedio" align="right" />
              <Th field="maximo_dias" label="Máximo" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((row) => {
              
              return (
                <tr key={`${row.anio_mes}-${row.zona}`} className="even:bg-bg-elevated hover:bg-bg-elevated transition-colors">
                  <td className="px-4 py-3 text-sm text-text-primary">{row.anio_mes}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{row.zona}</td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right tabular-nums">{formatNumber(row.total)}</td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right tabular-nums">{formatDecimal(row.mediana_dias)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{formatDecimal(row.promedio_dias)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{formatNumber(row.maximo_dias)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-elevated/30">
          <span className="text-sm text-text-muted">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 sm:py-1 min-w-[88px] min-h-[44px] sm:min-h-0 sm:min-w-0 bg-bg-surface border border-border rounded text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 sm:py-1 min-w-[88px] min-h-[44px] sm:min-h-0 sm:min-w-0 bg-bg-surface border border-border rounded text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
