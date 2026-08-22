'use client'

import React from 'react'
import { KpisVentas, FilaRanking, formatMoneda, formatMonedaCorta, formatPct, formatEntero } from '@/lib/ventas'
import { KpiCard } from '../logistica/KpiCard'

interface KpiRowProps {
  kpis: KpisVentas | null;
  kpisExterno?: KpisVentas | null;
  kpisMostrador?: KpisVentas | null;
  rankingVendedoresExterno?: FilaRanking[];
  canalParam?: string | null;
  isUltimoMes?: boolean;
  partialMonth?: string | null;
}

export function KpiRow({ 
  kpis, 
  kpisExterno, 
  kpisMostrador, 
  rankingVendedoresExterno,
  canalParam,
  isUltimoMes,
  partialMonth 
}: KpiRowProps) {
  if (!kpis) {
    return (
      <div className="grid gap-3 sm:gap-4 mb-8 grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 h-[100px] flex flex-col justify-center items-center">
            <span className="text-text-muted text-scale-sm">Sin datos</span>
          </div>
        ))}
      </div>
    )
  }

  const warningIncompleto = partialMonth ? <span className="text-warning font-normal text-scale-xs block mt-1 leading-tight text-center">Periodo incompleto, el % va a subir</span> : undefined;
  const footnoteEnProceso = !isUltimoMes ? <span className="text-text-muted font-normal text-scale-xs block mt-1 leading-tight text-center">Solo cotizaciones de los últimos días</span> : undefined;

  const abandonado = kpisExterno?.impSinSeguimiento || 0
  const cotizadoExterno = kpisExterno?.impCotizado || 0
  const abandonadoPct = cotizadoExterno > 0 ? (abandonado / cotizadoExterno) * 100 : 0
  const footnoteAbandonado = (
    <span className="text-text-muted font-normal text-scale-xs block mt-1 leading-tight text-center">
      {!canalParam || canalParam === 'Todos' ? "Solo cliente con ficha. " : ""}
      {abandonadoPct > 0 ? `${formatPct(abandonadoPct)} del cotizado.` : ""}
    </span>
  )

  let textoConcentracion = null
  if (abandonado > 0 && rankingVendedoresExterno && rankingVendedoresExterno.length > 0) {
    const v1 = rankingVendedoresExterno[0]
    const v2 = rankingVendedoresExterno[1]
    const p1 = (v1.impSinSeguimiento || 0) / abandonado
    const p2 = v2 ? ((v2.impSinSeguimiento || 0) / abandonado) : 0
    
    if (p1 > 0.4) {
      textoConcentracion = (
        <span>
          <strong>{formatMonedaCorta(abandonado)} sin seguimiento.</strong> {v1.nombre} ({formatMonedaCorta(v1.impSinSeguimiento)}) concentra el {formatPct(p1 * 100)}.
        </span>
      )
    } else if (p1 > 0.25) {
      textoConcentracion = (
        <span>
          <strong>{formatMonedaCorta(abandonado)} sin seguimiento.</strong> {v1.nombre} ({formatMonedaCorta(v1.impSinSeguimiento)}) y {v2?.nombre} ({formatMonedaCorta(v2?.impSinSeguimiento)}) concentran el {formatPct((p1 + p2) * 100)}.
        </span>
      )
    }
  }

  const mostradorImpSinSeguimiento = kpisMostrador?.impSinSeguimiento || 0

  return (
    <div className="mb-8">
      {/* Primera fila: KPI Principales (4 tarjetas) */}
      <div className="grid gap-3 sm:gap-4 mb-2 grid-cols-2 sm:grid-cols-4">
        <KpiCard
          title="Facturado"
          value={formatMoneda(kpis.impFacturado)}
          tooltip="Lo que ya se convirtió en factura en el periodo. Es la única cifra que representa dinero real."
        />
        <KpiCard
          title="En la mesa"
          value={formatMoneda(kpis.impEnProceso)}
          secondary={footnoteEnProceso}
          tooltip="Cotizado que sigue vivo: no ha cerrado, pero tampoco se abandonó ni se canceló. Es lo que todavía puede caer. Solo tiene sentido en el mes en curso: a los diez días una cotización ya se resolvió en un sentido o en otro."
        />
        
        <div data-tour="kpi-sin-seguimiento" className="h-full">
          <KpiCard
            title="Abandonado"
            value={formatMoneda(abandonado)}
            secondary={footnoteAbandonado}
            className="ring-1 ring-warning"
            tooltip="Cotizado a clientes con ficha que nadie volvió a tocar en diez días y el sistema suspendió solo. No son ventas perdidas: son ventas que nadie persiguió. Es lo único de esta fila sobre lo que se puede actuar hoy."
          />
        </div>

        {kpis.cotizaciones !== null ? (
          <KpiCard
            title="Cotizaciones"
            value={formatEntero(kpis.cotizaciones)}
            tooltip="Cuántas cotizaciones se emitieron en el periodo. Es el volumen de actividad, antes de saber si se cerró o no."
          />
        ) : (
          <div className="hidden"></div>
        )}
      </div>

      {/* Concentración de Abandono */}
      {textoConcentracion && (
        <div className="text-scale-sm text-text-primary mb-6 ml-1">
          {textoConcentracion}
        </div>
      )}

      {/* Segunda fila: Contexto (3 tarjetas) */}
      <div className="grid gap-3 sm:gap-4 mb-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
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
        <KpiCard
          title="Partida más grande"
          value={formatMoneda(kpis.impRenglonMax)}
          tooltip="El producto de mayor monto en una sola cotización del periodo. Sirve para detectar errores de captura: si un mes se dispara, casi siempre es un dedazo en la cantidad."
        />
      </div>

      {/* Mensaje de Mostrador */}
      {(!canalParam || canalParam === 'mostrador') && mostradorImpSinSeguimiento > 0 && (
        <div className="text-scale-sm text-text-muted mt-2 ml-1">
          <strong>Consultas de mostrador:</strong> {formatMonedaCorta(mostradorImpSinSeguimiento)} cotizados que no se concretaron. Es tráfico de piso preguntando precios, no seguimiento pendiente.
        </div>
      )}
    </div>
  )
}
