import React from 'react'
import Link from 'next/link'
import { Truck, ArrowRight } from 'lucide-react'
import { formatDecimal, formatNumber } from '@/lib/format'
import type { ResumenLogistica } from '@/lib/aggregate'
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

export function PanelLogistica({ resumen, empresa }: { resumen: ResumenLogistica | null, empresa: Empresa }) {
  return (
    <section data-tour="panel-logistica" className="mb-10 rounded-lg border border-border bg-bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-scale-xl font-semibold font-exo text-text-primary">
              Logística - {empresa.nombreCorto}
            </h2>
            <p className="text-scale-sm text-text-muted">
              Tiempos de entrega desde la cotización hasta la validación
            </p>
          </div>
        </div>

        <Link
          href={`/${empresa.id}/logistica`}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-scale-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Ver el módulo completo
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {resumen === null ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="text-scale-sm text-text-muted">
            No hay datos de entregas para mostrar. Revisa el estado de la actualización automática
            en el módulo de logística.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              etiqueta="Tiempo típico de entrega"
              valor={`${formatDecimal(resumen.medianaDias)} d`}
              nota={`Meta: ${empresa.metaDias} días`}
              tono={resumen.cumpleMeta ? 'bueno' : 'alerta'}
            />
            <Indicador
              etiqueta="Meses dentro de meta"
              valor={`${resumen.mesesEnMeta} de ${resumen.mesesTotales}`}
              nota="Medido sobre la mediana de cada mes"
              tono={resumen.mesesEnMeta === resumen.mesesTotales ? 'bueno' : 'neutro'}
            />
            <Indicador
              etiqueta="Etapa más lenta"
              valor={`${formatDecimal(resumen.etapaMasLentaPorcentaje)}%`}
              nota={`${resumen.etapaMasLentaNombre} — del ciclo total`}
              ancla="etapa-lenta"
            />
            {empresa.usaZonas ? (
              <Indicador
                etiqueta="Zonas fuera de meta"
                valor={`${resumen.zonasFueraDeMeta} de ${resumen.zonasTotales}`}
                nota="Zonas con mediana arriba de la meta"
                tono={resumen.zonasFueraDeMeta === 0 ? 'bueno' : 'alerta'}
              />
            ) : (
              <Indicador
                etiqueta="Total entregas"
                valor={formatNumber(resumen.entregas)}
                nota="En el periodo analizado"
                tono="neutro"
              />
            )}
          </div>

          <p className="mt-4 text-scale-xs text-text-muted">
            Calculado sobre {formatNumber(resumen.entregas)} entregas validadas. El tiempo típico es
            la mediana ponderada por volumen, no el promedio.
          </p>
        </>
      )}
    </section>
  )
}
