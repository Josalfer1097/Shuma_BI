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
}

export function KpiRow({ 
  kpis, 
  kpisExterno, 
  kpisMostrador, 
  rankingVendedoresExterno,
  canalParam,
  isUltimoMes,
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

  const footnoteEnProceso = !isUltimoMes ? <span className="text-text-muted font-normal text-scale-xs block mt-1 leading-tight text-center">Solo cotizaciones de los últimos días</span> : undefined;

  const abandonado = kpisExterno?.impSinSeguimiento || 0
  const cotizadoExterno = kpisExterno?.impCotizado || 0
  const abandonadoPct = cotizadoExterno > 0 ? (abandonado / cotizadoExterno) * 100 : 0
  const footnoteAbandonado = (
    <span className="text-text-muted font-normal text-scale-xs block mt-1 leading-tight text-center">
      {!canalParam || canalParam === 'Todos' ? "Solo clientes registrados, excluye mostrador. " : ""}
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

  let txtPartidaStatus = ''
  if (kpis.impRenglonMax > 0) {
    if (kpis.renglonMaxConvertido >= kpis.impRenglonMax) {
      txtPartidaStatus = 'Ya llegó a factura'
    } else if (kpis.renglonMaxConvertido === 0) {
      txtPartidaStatus = 'Sigue en proceso de venta'
    } else {
      txtPartidaStatus = 'Parcialmente facturado'
    }
  }

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
            title="Sin seguimiento"
            value={formatMoneda(abandonado)}
            secondary={footnoteAbandonado}
            className="ring-1 ring-warning"
            tooltip="Cotizado a clientes registrados que nadie volvió a tocar en diez días y el sistema suspendió solo. No son ventas perdidas: son ventas que nadie persiguió. Es lo único de esta fila sobre lo que se puede actuar hoy."
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

      {/* Partida mas grande: contexto, no KPI. Es el unico dato concreto en un
          tablero de agregados y sirve para cazar dedazos de captura, pero no
          compite con los KPIs. Los KPIs de conversion que vivian aqui se
          quitaron: la banda de fuga y el panel de concentracion contestan esa
          misma pregunta con mas precision. */}
      {kpis.impRenglonMax > 0 && (
        <div className="mt-6 border-t border-border pt-4 text-scale-sm text-text-muted">
          <span className="text-text-secondary">Partida más grande:</span>{' '}
          <span className="tabular-nums text-text-primary">{formatMoneda(kpis.impRenglonMax)}</span>
          {' — '}
          {kpis.artRenglonMax}
          {kpis.cantRenglonMax > 0 && (
            <>
              {' · '}
              {kpis.cantRenglonMax.toLocaleString('es-MX')} pzas
              {' · '}
              {formatMoneda(kpis.impRenglonMax / kpis.cantRenglonMax)} c/u
            </>
          )}
          {txtPartidaStatus && <>{' · '}{txtPartidaStatus}</>}
        </div>
      )}

      {/* Mensaje de Mostrador */}
      {(!canalParam || canalParam === 'mostrador') && mostradorImpSinSeguimiento > 0 && (
        <div className="text-scale-sm text-text-muted mt-2 ml-1">
          <strong>Consultas de mostrador:</strong> {formatMonedaCorta(mostradorImpSinSeguimiento)} cotizados que no se concretaron. Es tráfico de piso preguntando precios, no seguimiento pendiente.
        </div>
      )}
    </div>
  )
}
