import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'
import { formatDecimal, formatNumber } from '@/lib/format'
import type { ResumenLogistica } from '@/lib/aggregate'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Es lo unico que hay en esa pantalla, asi que carga todo el peso visual. El
 * color de la empresa no aparece como un detalle sino como el elemento
 * dominante: resplandor de fondo, iniciales de marca de agua y franja
 * superior. Antes de leer el nombre ya se distingue de cual se trata.
 *
 * Muestra un solo indicador a proposito. La portada sirve para elegir, no
 * para analizar; los cuatro indicadores viven un nivel adentro.
 */
export function EmpresaCard({
  empresa,
  resumen,
}: {
  empresa: Empresa
  resumen: ResumenLogistica | null
}) {
  const color = `var(--empresa-${empresa.id})`
  const iniciales = empresa.nombreCorto.slice(0, 2).toUpperCase()

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}`}
      style={{ ['--color-empresa' as string]: color }}
      className="group relative isolate flex min-h-[19rem] flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[color:var(--color-empresa)] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-empresa)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Franja de color: la senal mas rapida de que empresa es. */}
      <div
        className="h-1 w-full shrink-0 transition-[height] duration-300 group-hover:h-1.5"
        style={{ backgroundColor: color }}
      />

      {/* Resplandor difuso detras del contenido. Sube de intensidad al pasar
          el cursor para que la tarjeta se sienta viva sin animar nada mas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full opacity-[0.14] blur-3xl transition-opacity duration-300 group-hover:opacity-30"
        style={{ backgroundColor: color }}
      />

      {/* Iniciales como marca de agua. Da textura a una tarjeta que de otro
          modo seria una caja con texto. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -right-3 -z-10 select-none font-exo text-[9rem] font-bold leading-none opacity-[0.045] transition-opacity duration-300 group-hover:opacity-[0.09]"
        style={{ color }}
      >
        {iniciales}
      </span>

      <div className="flex flex-1 flex-col p-7 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-scale-xs font-medium uppercase tracking-wider"
            style={{ borderColor: color + '59', color }}
          >
            {empresa.id === 'cfs' ? 'Comercializadora' : 'Acabados'}
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition-all duration-300 group-hover:border-[color:var(--color-empresa)] group-hover:text-[color:var(--color-empresa)]"
            aria-hidden="true"
          >
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>

        <h2 className="text-scale-2xl font-semibold font-exo leading-tight text-text-primary">
          {empresa.nombre}
        </h2>
        <p className="mt-2 text-scale-sm text-text-muted">{empresa.descripcion}</p>

        <div className="mt-auto pt-8">
          {resumen === null ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-5">
              <p className="text-scale-sm text-text-muted">Sin datos cargados todavía</p>
            </div>
          ) : (
            <>
              <p className="text-scale-xs uppercase tracking-wider text-text-muted">
                Tiempo típico de entrega
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="font-exo text-scale-4xl font-bold leading-none"
                  style={{ color: resumen.cumpleMeta ? 'var(--success)' : 'var(--danger)' }}
                >
                  {formatDecimal(resumen.medianaDias)}
                </span>
                <span className="text-scale-lg text-text-muted">días</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-4 text-scale-xs text-text-muted">
                <span>
                  Meta: <span className="text-text-secondary">{empresa.metaDias} días</span>
                </span>
                <span>
                  <span className="text-text-secondary">{formatNumber(resumen.entregas)}</span>{' '}
                  entregas
                </span>
                {resumen.mesesTotales > 0 && (
                  <span>
                    <span className="text-text-secondary">
                      {resumen.mesesEnMeta} de {resumen.mesesTotales}
                    </span>{' '}
                    meses en meta
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
