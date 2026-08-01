'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/types'
import { KpiCard } from './KpiCard'
import { formatNumber, formatDecimal } from '@/lib/format'

interface KpiRowProps {
  metrics: DashboardMetrics | null;
}

export function KpiRow({ metrics }: KpiRowProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 h-[160px] flex flex-col justify-center items-center">
            <span className="text-text-muted text-sm">Sin datos</span>
          </div>
        ))}
      </div>
    )
  }

  const diasFactura = metrics.med_entrega_factura ?? 0;
  let facturaColor = 'text-success';
  if (diasFactura >= 1 && diasFactura <= 3) {
    facturaColor = 'text-warning';
  } else if (diasFactura > 3) {
    facturaColor = 'text-danger';
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
      <KpiCard
        title="Total entregas"
        value={formatNumber(metrics.total)}
        description="Cotizaciones validadas y cerradas correctamente en la seleccion actual."
      />
      <KpiCard
        title="Promedio dias"
        value={formatDecimal(metrics.promedio_dias)}
        description="Promedio real de dias, exacto para la seleccion. Sensible a casos extremos."
      />
      <KpiCard
        title="Mediana dias"
        value={formatDecimal(metrics.mediana_dias)}
        description="Promedio ponderado de las medianas mensuales — el numero mas confiable de 'tiempo tipico'."
      />
      <KpiCard
        title="Maximo dias"
        value={formatDecimal(metrics.maximo_dias)}
        description="El caso mas lento dentro de la seleccion — util para detectar focos rojos."
      />
      <KpiCard
        title="Con factura ligada"
        value={formatNumber(metrics.total_con_factura)}
        description="Cotizaciones que si se lograron ligar a su factura por la cadena pedido → remision → factura."
      />
      <KpiCard
        title="Dias hasta facturar"
        value={`${formatDecimal(diasFactura)}d`}
        valueColor={facturaColor}
        description="Tiempo entre que se entrega el material y se genera la factura. En Shuma se factura por lote al cierre del dia."
      />
    </div>
  )
}
