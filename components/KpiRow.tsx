'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/types'
import { KpiCard } from './KpiCard'
import { formatNumber, formatDecimal, formatPercent } from '@/lib/format'

interface KpiRowProps {
  metrics: DashboardMetrics | null;
  selectedZonesCount: number;
  selectedMonthsCount: number;
}

export function KpiRow({ metrics, selectedZonesCount, selectedMonthsCount }: KpiRowProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 h-[116px] flex flex-col justify-center items-center">
            <span className="text-text-muted text-sm">Sin datos para la selección actual</span>
          </div>
        ))}
      </div>
    )
  }

  const outOfRangePercent = metrics.total > 0 ? (metrics.facturas_fuera_de_rango / metrics.total) : 0;
  const isOutOfRangeHigh = outOfRangePercent > 0.5; // High if over 50% as requested for the table, maybe 10% here? We'll use 50% threshold for alert.

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KpiCard
        title="Entregas totales"
        value={formatNumber(metrics.total)}
        secondary={`${selectedZonesCount} zona${selectedZonesCount > 1 ? 's' : ''}, ${selectedMonthsCount} mes${selectedMonthsCount > 1 ? 'es' : ''}`}
        tooltip="Cotizaciones entregadas y validadas por logística en el periodo seleccionado."
      />
      <KpiCard
        title="Tiempo típico"
        value={`${formatDecimal(metrics.mediana_dias)}d`}
        secondary={`vs ${formatDecimal(metrics.promedio_dias)} promedio`}
        tooltip="La mitad de las entregas tardan menos que este número. Es más confiable que el promedio porque no lo distorsionan los casos extremos."
      />
      <KpiCard
        title="Caso más lento"
        value={`${formatNumber(metrics.maximo_dias)}d`}
        tooltip="La entrega que más tardó en la selección actual. Sirve para detectar focos rojos, no para sacar conclusiones generales."
      />
      <KpiCard
        title="Facturas fuera de rango"
        value={formatNumber(metrics.facturas_fuera_de_rango)}
        secondary={`${formatPercent(metrics.facturas_fuera_de_rango, metrics.total)} del total`}
        alert={isOutOfRangeHigh}
        tooltip="Entregas donde la factura se generó antes de surtir o después de salir a ruta. El orden esperado es surtir, facturar y luego enviar a ruta."
      />
    </div>
  )
}
