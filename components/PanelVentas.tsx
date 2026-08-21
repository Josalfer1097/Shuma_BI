import React from 'react'
import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { formatMonedaCorta, formatPct, formatEntero } from '@/lib/ventas'
import type { KpisVentas } from '@/lib/ventas'
import type { Empresa } from '@/lib/empresas'

function Indicador({
  etiqueta,
  valor,
  nota,
  tono = 'neutro',
  ancla,
}: {
  etiqueta: string
  valor: string
  nota: string
  tono?: 'neutro' | 'bueno' | 'alerta'
  ancla?: string
}) {
  const colorValor =
    tono === 'bueno' ? 'text-success' : tono === 'alerta' ? 'text-danger' : 'text-text-primary'

  return (
    <div data-tour={ancla} className="flex flex-col gap-1 rounded-md border border-border bg-bg-base/40 p-4">
      <span className="text-scale-xs uppercase tracking-wide text-text-muted">{etiqueta}</span>
      <span className={`text-scale-2xl font-semibold font-exo ${colorValor}`}>{valor}</span>
      <span className="text-scale-xs text-text-muted">{nota}</span>
    </div>
  )
}

export function PanelVentas({
  kpis,
  empresa,
  nombreMes,
}: {
  kpis: KpisVentas | null
  empresa: Empresa
  nombreMes: string
}) {
  return (
    <section data-tour="panel-ventas" className="mb-10 rounded-lg border border-border bg-bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-scale-xl font-semibold font-exo text-text-primary">
              Ventas - {empresa.nombreCorto}
            </h2>
            <p className="text-scale-sm text-text-muted">
              Colocación, conversión de cotizaciones y comportamiento por zona
            </p>
          </div>
        </div>

        <Link
          href={`/${empresa.id}/ventas`}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-scale-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Ver el módulo completo
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {kpis === null ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="text-scale-sm text-text-muted">
            No hay datos de ventas para mostrar. Revisa el estado de la actualización automática
            en el módulo de ventas.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              etiqueta="Facturado del mes"
              valor={formatMonedaCorta(kpis.impFacturado)}
              nota={nombreMes}
              tono="neutro"
            />
            <Indicador
              etiqueta="Conversión por importe"
              valor={formatPct(kpis.convImportePct)}
              nota="De cada 100 pesos cotizados"
              tono="neutro"
            />
            <Indicador
              etiqueta="Cotizaciones"
              valor={formatEntero(kpis.cotizaciones)}
              nota="Emitidas en el mes"
              tono="neutro"
            />
            <Indicador
              etiqueta="Sin seguimiento"
              valor={formatPct(kpis.sinSeguimientoPct)}
              nota="10 días sin que nadie las toque"
              tono={
                kpis.sinSeguimientoPct !== null && kpis.sinSeguimientoPct > 30
                  ? 'alerta'
                  : kpis.sinSeguimientoPct !== null && kpis.sinSeguimientoPct > 15
                  ? 'neutro'
                  : 'bueno'
              }
            />
          </div>

          <p className="mt-4 text-scale-xs text-text-muted">
            Excluye venta entre empresas del grupo.
          </p>
        </>
      )}
    </section>
  )
}
