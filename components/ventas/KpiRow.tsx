'use client'

import React from 'react'
import { KpisVentas, formatMoneda, formatPct, formatEntero } from '@/lib/ventas'
import { KpiCard } from '../logistica/KpiCard'
import { cn } from '../ui/Tooltip'

interface KpiRowProps {
  kpis: KpisVentas | null;
}

export function KpiRow({ kpis }: KpiRowProps) {
  if (!kpis) {
    return (
      <div className="grid gap-3 sm:gap-4 mb-8 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 h-[100px] flex flex-col justify-center items-center">
            <span className="text-text-muted text-scale-sm">Sin datos</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 mb-8 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Importe facturado"
        value={formatMoneda(kpis.impFacturado)}
        tooltip="Dinero total facturado en la selección."
      />
      <KpiCard
        title="Conv. renglones"
        value={formatPct(kpis.convRenglonesPct)}
        tooltip="De cada cien líneas cotizadas, cuántas terminaron facturadas."
      />
      <KpiCard
        title="Conv. importe"
        value={formatPct(kpis.convImportePct)}
        tooltip="De cada cien pesos cotizados, cuántos terminaron facturados."
      />
      
      {kpis.cotizaciones !== null ? (
        <KpiCard
          title="Cotizaciones"
          value={formatEntero(kpis.cotizaciones)}
          tooltip="Número total de cotizaciones elaboradas."
        />
      ) : (
        <div className="hidden"></div>
      )}

      {kpis.sinSeguimientoPct !== null ? (
        <KpiCard
          title="Sin seguimiento"
          value={formatPct(kpis.sinSeguimientoPct)}
          valueColor={kpis.sinSeguimientoPct > 30 ? "text-danger" : kpis.sinSeguimientoPct > 15 ? "text-warning" : "text-text-primary"}
          tooltip="Porcentaje de cotizaciones que el sistema suspendió solas porque nadie las volvió a tocar en 10 días."
        />
      ) : (
        <div className="hidden"></div>
      )}

      <KpiCard
        title="Renglón más grande"
        value={formatMoneda(kpis.impRenglonMax)}
        tooltip="El renglón con mayor importe cotizado en la selección."
      />
    </div>
  )
}
