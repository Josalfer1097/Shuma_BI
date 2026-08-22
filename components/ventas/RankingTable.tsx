'use client'

import React, { useState } from 'react'
import { FilaRanking, Dimension, formatMoneda, formatPct, formatEntero, cotizacionesSumables } from '@/lib/ventas'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Search } from 'lucide-react'

interface RankingTableProps {
  data: FilaRanking[]
  dimension: Dimension
  cargando?: boolean
  periodoLabel?: string
}

type SortField = keyof FilaRanking
type SortDirection = 'asc' | 'desc'

export function RankingTable({ data, dimension, cargando, periodoLabel }: RankingTableProps) {
  const [sortField, setSortField] = useState<SortField>('impFacturado')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [isOpen, setIsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const rowsPerPage = 25

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  const normalizedSearch = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const filteredData = data.filter(row => {
    if (!normalizedSearch) return true
    const nombre = (row.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const codigo = (row.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return nombre.includes(normalizedSearch) || codigo.includes(normalizedSearch)
  })

  const sortedData = [...filteredData].sort((a, b) => {
    const valA = a[sortField] ?? 0
    const valB = b[sortField] ?? 0
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const paginatedData = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const showCotizaciones = cotizacionesSumables(dimension)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />
  }

  const thClass = "py-3 px-4 font-medium cursor-pointer hover:bg-bg-elevated/50 transition-colors whitespace-nowrap"

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden mb-8 flex flex-col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-elevated transition-colors border-b border-border"
      >
        <h3 className="text-scale-lg font-medium text-text-primary">
          Ranking por {dimension} {periodoLabel && <span className="text-text-muted text-scale-md font-normal ml-1">({periodoLabel})</span>}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-scale-sm text-text-muted">{data.length} registros</span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="p-4 border-b border-border bg-bg-base/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o código..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-scale-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border text-scale-sm text-text-secondary bg-bg-base/30">
                  <th className={thClass} onClick={() => handleSort('nombre')}>
                    Nombre <SortIcon field="nombre" />
                  </th>
                  <th className={thClass + " text-right"} onClick={() => handleSort('impFacturado')}>
                    Facturado <SortIcon field="impFacturado" />
                  </th>
                  <th className={thClass + " text-right"} onClick={() => handleSort('impCotizado')}>
                    Cotizado <SortIcon field="impCotizado" />
                  </th>
                  <th className={thClass + " text-right"} onClick={() => handleSort('convImportePct')}>
                    Conv. Importe <SortIcon field="convImportePct" />
                  </th>
                  <th className={thClass + " text-right"} onClick={() => handleSort('convRenglonesPct')}>
                    Conv. Productos <SortIcon field="convRenglonesPct" />
                  </th>
                  {showCotizaciones && (
                    <>
                      <th className={thClass + " text-right"} onClick={() => handleSort('cotizaciones')}>
                        Cotizaciones <SortIcon field="cotizaciones" />
                      </th>
                      <th className={thClass + " text-right"} onClick={() => handleSort('sinSeguimientoPct')}>
                        Sin Seg. % <SortIcon field="sinSeguimientoPct" />
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cargando ? (
                  <tr>
                    <td colSpan={showCotizaciones ? 7 : 5} className="py-8 text-center text-text-muted text-scale-sm">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                        <span className="ml-3">Cargando ranking de {dimension}...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={showCotizaciones ? 7 : 5} className="py-8 text-center text-text-muted text-scale-sm">
                      No hay datos para mostrar con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, i) => (
                    <tr key={`${row.dimensionId}-${i}`} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-scale-sm text-text-primary font-medium">{row.nombre}</span>
                          <span className="text-scale-xs text-text-muted">{row.codigo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-scale-sm text-text-primary">
                        {formatMoneda(row.impFacturado)}
                      </td>
                      <td className="py-3 px-4 text-right text-scale-sm text-text-secondary">
                        {formatMoneda(row.impCotizado)}
                      </td>
                      <td className="py-3 px-4 text-right text-scale-sm text-text-secondary">
                        {formatPct(row.convImportePct)}
                      </td>
                      <td className="py-3 px-4 text-right text-scale-sm text-text-secondary">
                        {formatPct(row.convRenglonesPct)}
                      </td>
                      {showCotizaciones && (
                        <>
                          <td className="py-3 px-4 text-right text-scale-sm text-text-secondary">
                            {formatEntero(row.cotizaciones)}
                          </td>
                          <td className={`py-3 px-4 text-right text-scale-sm ${row.sinSeguimientoPct !== null && row.sinSeguimientoPct > 30 ? 'text-danger' : row.sinSeguimientoPct !== null && row.sinSeguimientoPct > 15 ? 'text-warning' : 'text-text-secondary'}`}>
                            {formatPct(row.sinSeguimientoPct)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-elevated/30">
              <span className="text-scale-sm text-text-muted">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 sm:py-1 min-w-[88px] min-h-[44px] sm:min-h-0 sm:min-w-0 bg-bg-surface border border-border rounded text-scale-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 sm:py-1 min-w-[88px] min-h-[44px] sm:min-h-0 sm:min-w-0 bg-bg-surface border border-border rounded text-scale-sm text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
