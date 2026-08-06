'use client'

import React from 'react'
import { DashboardMetrics } from '@/lib/types'
import { KpiCard } from './KpiCard'
import { formatNumber, formatDecimal } from '@/lib/format'
import { useEmpresa } from '@/lib/empresaContext'
import { cn } from '../ui/Tooltip'

interface KpiRowProps {
  metrics: DashboardMetrics | null;
}

export function KpiRow({ metrics }: KpiRowProps) {
  const { usaZonas } = useEmpresa()

  if (!metrics) {
    return (
      <div className={cn("grid gap-3 sm:gap-4 mb-8", usaZonas ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
        {Array.from({ length: usaZonas ? 8 : 6 }).map((_, i) => (
          <div key={i} className={cn("bg-bg-surface border border-border rounded-lg p-5 h-[100px] flex flex-col justify-center items-center", usaZonas && i === 6 ? "lg:col-span-2" : "")}>
            <span className="text-text-muted text-scale-sm">Sin datos</span>
          </div>
        ))}
      </div>
    )
  }

  const diasFactura = metrics.med_entrega_factura ?? 0;
  let facturaColor = 'text-success';
  if (diasFactura < 0) {
    facturaColor = 'text-warning';
  } else if (diasFactura >= 1 && diasFactura <= 3) {
    facturaColor = 'text-warning';
  } else if (diasFactura > 3) {
    facturaColor = 'text-danger';
  }

  return (
    <div className={cn("grid gap-3 sm:gap-4 mb-8", usaZonas ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6")}>
      <KpiCard
        title="Total entregas"
        value={formatNumber(metrics.total)}
        tooltip="Cotizaciones validadas y cerradas correctamente en la seleccion actual."
      />
      <KpiCard
        title="Promedio dias"
        value={formatDecimal(metrics.promedio_dias)}
        tooltip="Promedio real de dias, exacto para la seleccion. Sensible a casos extremos."
      />
      <KpiCard
        title="Mediana dias"
        value={formatDecimal(metrics.mediana_dias)}
        tooltip='Promedio ponderado de las medianas mensuales — el numero mas confiable de "tiempo tipico".'
      />
      <KpiCard
        title="Maximo dias"
        value={formatDecimal(metrics.maximo_dias)}
        tooltip="El caso mas lento dentro de la seleccion — util para detectar focos rojos."
      />
      <KpiCard
        title="Con factura ligada"
        value={formatNumber(metrics.total_con_factura)}
        tooltip="Cotizaciones que si se lograron ligar a su factura por la cadena pedido → remision → factura."
      />
      <KpiCard
        title="Entrega a factura"
        value={`${diasFactura > 0 ? '+' : ''}${formatDecimal(diasFactura)}d`}
        valueColor={facturaColor}
        tooltip="Dias entre que el material se entrega al cliente y que se genera la factura. En Shuma se factura por lote al cierre del dia, asi que lo normal es que sea menos de un dia. Importa porque la cobranza no arranca hasta que existe la factura."
      />
      
      {usaZonas && (() => {
        if (metrics.total_zonas_mes_evaluadas < 3) {
          return (
            <KpiCard
              className="xl:col-span-2"
              title="Zonas-mes en meta"
              value="-"
              secondaryValue="muestra insuficiente"
              valueColor="text-text-muted"
              tooltip="Porcentaje de combinaciones de zona y mes cuya mediana esta dentro de los cinco dias. Se mide por combinacion y no por volumen para que una zona con pocas entregas y mal desempeno no quede escondida. El dato de abajo si es por volumen de entregas."
            />
          )
        }

        const pct = (metrics.zonas_mes_cumplen_meta / metrics.total_zonas_mes_evaluadas) * 100
        const pctVol = (metrics.entregas_cumplen_meta / metrics.total) * 100

        let color = 'text-success'
        if (pct < 75) color = 'text-danger'
        else if (pct < 90) color = 'text-warning'

        return (
          <KpiCard
            className="xl:col-span-2"
            title="Zonas-mes en meta"
            value={`${formatDecimal(pct)}%`}
            secondaryValue={`${formatDecimal(pctVol)}% de las entregas`}
            secondaryLayout="inline"
            valueColor={color}
            tooltip="Porcentaje de combinaciones de zona y mes cuya mediana esta dentro de los cinco dias. Se mide por combinacion y no por volumen para que una zona con pocas entregas y mal desempeno no quede escondida. El dato de abajo si es por volumen de entregas."
          />
        )
      })()}
    </div>
  )
}
