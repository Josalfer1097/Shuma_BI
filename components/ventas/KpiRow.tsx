'use client'

import React from 'react'
import { KpisVentas, formatMoneda, formatPct, formatEntero } from '@/lib/ventas'
import { KpiCard } from '../logistica/KpiCard'
interface KpiRowProps {
  kpis: KpisVentas | null;
  partialMonth?: string | null;
}

export function KpiRow({ kpis, partialMonth }: KpiRowProps) {
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

  const warningIncompleto = partialMonth ? <span className="text-warning font-normal text-scale-xs block mt-1 leading-tight text-center">Periodo incompleto, el % va a subir</span> : undefined;

  return (
    <div className="grid gap-3 sm:gap-4 mb-8 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Facturado"
        value={formatMoneda(kpis.impFacturado)}
        tooltip="Lo que ya se convirtió en factura en el periodo. Es la única cifra que representa dinero real."
      />
      <KpiCard
        title="Productos que se cierran"
        value={formatPct(kpis.convRenglonesPct)}
        secondary={warningIncompleto}
        className={partialMonth ? "ring-1 ring-warning" : ""}
        tooltip="De cada cien productos cotizados, cuántos terminaron facturados. Mide qué tan seguido se concreta una cotización."
      />
      <KpiCard
        title="Dinero que se cierra"
        value={formatPct(kpis.convImportePct)}
        secondary={warningIncompleto}
        className={partialMonth ? "ring-1 ring-warning" : ""}
        tooltip="De cada cien pesos cotizados, cuántos terminaron facturados. Siempre es menor que el porcentaje de productos: las cotizaciones grandes cierran menos que las chicas. Si la brecha entre ambos crece, se está cotizando mucho que no aterriza."
      />
      
      {kpis.cotizaciones !== null ? (
        <KpiCard
          title="Cotizaciones"
          value={formatEntero(kpis.cotizaciones)}
          tooltip="Cuántas cotizaciones se emitieron en el periodo. Es el volumen de actividad, antes de saber si se cerró o no."
        />
      ) : (
        <div className="hidden"></div>
      )}

      {kpis.sinSeguimientoPct !== null ? (
        <div data-tour="kpi-sin-seguimiento" className="h-full">
          <KpiCard
            title="Sin seguimiento"
            value={formatPct(kpis.sinSeguimientoPct)}
            valueColor={kpis.sinSeguimientoPct > 30 ? "text-danger" : kpis.sinSeguimientoPct > 15 ? "text-warning" : "text-text-primary"}
            tooltip="Cotizaciones que nadie volvió a tocar en diez días y el sistema suspendió solo. No son ventas perdidas: son ventas que nadie persiguió. Es el indicador sobre el que sí se puede actuar hoy mismo."
          />
        </div>
      ) : (
        <div className="hidden"></div>
      )}

      <KpiCard
        title="Partida más grande"
        value={formatMoneda(kpis.impRenglonMax)}
        tooltip="El producto de mayor monto en una sola cotización del periodo. Sirve para detectar errores de captura: si un mes se dispara, casi siempre es un dedazo en la cantidad."
      />
    </div>
  )
}
