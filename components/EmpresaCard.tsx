import React from 'react'
import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'
import { formatDecimal, formatNumber } from '@/lib/format'
import type { ResumenLogistica } from '@/lib/aggregate'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * La portada tiene una sola funcion: elegir empresa. Por eso la tarjeta
 * muestra un unico indicador, el tiempo tipico de entrega, y no los cuatro
 * del modulo. Todo lo demas vive un nivel adentro.
 */
export function EmpresaCard({
  empresa,
  resumen,
}: {
  empresa: Empresa
  resumen: ResumenLogistica | null
}) {
  const color = `var(--empresa-${empresa.id})`

  return (
    <Link
      href={`/${empresa.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-surface transition-colors hover:border-[color:var(--borde-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--borde-hover)]"
      style={{ ['--borde-hover' as string]: color }}
    >
      {/* Franja superior con el color de la empresa: es lo que las distingue
          de un vistazo antes de leer nada. */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: color + '26', color }}
          >
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <ArrowRight
            className="h-5 w-5 text-text-muted transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>

        <h2 className="text-scale-xl font-semibold font-exo text-text-primary">{empresa.nombre}</h2>
        <p className="mt-1 text-scale-sm text-text-muted">{empresa.descripcion}</p>

        <div className="mt-6 border-t border-border pt-5">
          {resumen === null ? (
            <p className="text-scale-sm text-text-muted">Sin datos cargados todavía</p>
          ) : (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-scale-xs uppercase tracking-wide text-text-muted">
                  Tiempo típico de entrega
                </p>
                <p
                  className="mt-1 text-scale-3xl font-semibold font-exo"
                  style={{ color: resumen.cumpleMeta ? 'var(--success)' : 'var(--danger)' }}
                >
                  {formatDecimal(resumen.medianaDias)} d
                </p>
              </div>
              <div className="text-right">
                <p className="text-scale-xs text-text-muted">Meta: {empresa.metaDias} días</p>
                <p className="mt-1 text-scale-xs text-text-muted">
                  {formatNumber(resumen.entregas)} entregas
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
