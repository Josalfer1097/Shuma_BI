import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Area } from '@/lib/areas'

/**
 * Tarjeta de area en la portada.
 *
 * Un area pendiente se muestra sin cifras a proposito. La diferencia visual
 * entre activa y pendiente es informacion: dice de un vistazo que partes de
 * la plataforma ya tienen datos y cuales no.
 */
export function AreaCard({ area, empresaId }: { area: Area; empresaId?: string }) {
  const Icono = area.icono

  if (area.estado === 'pendiente' || !area.ruta) {
    return (
      <div
        aria-disabled="true"
        className="group relative flex flex-col gap-3 rounded-lg border border-dashed border-border bg-bg-surface/40 p-5 cursor-not-allowed"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-elevated/60 text-text-muted">
            <Icono className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-scale-xs text-text-muted">
            Próximamente
          </span>
        </div>

        <div>
          <h3 className="text-scale-lg font-semibold text-text-secondary">{area.nombre}</h3>
          <p className="mt-1 text-scale-sm text-text-muted">{area.descripcion}</p>
        </div>
      </div>
    )
  }

  const href = empresaId && area.ruta ? `/${empresaId}${area.ruta}` : area.ruta!

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
          <Icono className="h-5 w-5" aria-hidden="true" />
        </div>
        <ArrowRight
          className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent"
          aria-hidden="true"
        />
      </div>

      <div>
        <h3 className="text-scale-lg font-semibold text-text-primary">{area.nombre}</h3>
        <p className="mt-1 text-scale-sm text-text-muted">{area.descripcion}</p>
      </div>
    </Link>
  )
}
