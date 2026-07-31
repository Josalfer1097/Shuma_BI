'use client'

import React, { useState } from 'react'
import { ReporteRow } from '@/lib/types'
import { formatNumber, formatDecimal, formatPercent } from '@/lib/format'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from './ui/Tooltip'

interface DetailTableProps {
  data: ReporteRow[];
}

type SortField = keyof ReporteRow
type SortDirection = 'asc' | 'desc'

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
    const aVal = a[sortField]
    const bVal = b[sortField]
    
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
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg-elevated/50">
              <Th field="anio_mes" label="Mes" />
              <Th field="zona" label="Zona" />
              <Th field="total" label="Entregas" align="right" />
              <Th field="mediana_dias" label="Mediana" align="right" />
              <Th field="promedio_dias" label="Promedio" align="right" />
              <Th field="maximo_dias" label="Máximo" align="right" />
              <Th field="facturas_fuera_de_rango" label="Fuera de rango" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((row) => {
              const outOfRangePercent = row.total > 0 ? (row.facturas_fuera_de_rango / row.total) : 0
              const isHigh = outOfRangePercent > 0.5
              
              return (
                <tr key={`${row.anio_mes}-${row.zona}`} className="hover:bg-bg-elevated transition-colors">
                  <td className="px-4 py-3 text-sm text-text-primary">{row.anio_mes}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{row.zona}</td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right tabular-nums">{formatNumber(row.total)}</td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right tabular-nums">{formatDecimal(row.mediana_dias)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{formatDecimal(row.promedio_dias)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{formatNumber(row.maximo_dias)}</td>
                  <td className={cn(
                    "px-4 py-3 text-sm text-right tabular-nums",
                    isHigh ? "bg-warning/20 text-warning font-medium" : "text-text-primary"
                  )}>
                    {formatNumber(row.facturas_fuera_de_rango)}
                    <span className="text-text-muted text-xs ml-1">({formatPercent(row.facturas_fuera_de_rango, row.total)})</span>
                  </td>
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
              className="px-3 py-1 bg-bg-surface border border-border rounded text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-bg-surface border border-border rounded text-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
