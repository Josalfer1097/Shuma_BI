'use client'

import React, { useState } from 'react'
import { FilaRanking, Dimension, formatMoneda, formatPct, formatEntero, cotizacionesSumables } from '@/lib/ventas'
import { ArrowDown, ArrowUp } from 'lucide-react'

interface RankingTableProps {
  data: FilaRanking[]
  dimension: Dimension
  cargando?: boolean
}

type SortField = keyof FilaRanking
type SortDirection = 'asc' | 'desc'

export function RankingTable({ data, dimension, cargando }: RankingTableProps) {
  const [sortField, setSortField] = useState<SortField>('impFacturado')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const valA = a[sortField] ?? 0
    const valB = b[sortField] ?? 0
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const showCotizaciones = cotizacionesSumables(dimension)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ArrowUp className="inline w-3 h-3 ml-1" /> : <ArrowDown className="inline w-3 h-3 ml-1" />
  }

  const thClass = "py-3 px-4 font-medium cursor-pointer hover:bg-bg-elevated/50 transition-colors whitespace-nowrap"

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden mb-8">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <h3 className="text-scale-lg font-medium text-text-primary">
          Ranking por {dimension}
        </h3>
        <span className="text-scale-sm text-text-muted">{data.length} registros</span>
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
                Conv. Renglones <SortIcon field="convRenglonesPct" />
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
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={showCotizaciones ? 7 : 5} className="py-8 text-center text-text-muted text-scale-sm">
                  No hay datos para mostrar con los filtros actuales
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => (
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
    </div>
  )
}
