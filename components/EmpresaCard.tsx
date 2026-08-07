import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'
import type { ResumenLogistica } from '@/lib/aggregate'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Es lo unico que hay en esa pantalla, asi que carga todo el peso visual. El
 * color de la empresa no aparece como un detalle sino como el elemento
 * dominante: resplandor de fondo, iniciales de marca de agua y franja
 * superior. Antes de leer el nombre ya se distingue de cual se trata.
 *
 * No lleva cifras a proposito. Un tiempo de entrega sin su meta y sin su
 * volumen al lado no significa nada para quien apenas esta entrando, y
 * ponerle esos datos de apoyo convertia la portada en un tablero mas.
 *
 * Lo que si lleva es una senal de estado: verde, ambar o gris. Es una senal,
 * no un dato, y esa es justamente la diferencia. Dice si hay algo que mirar
 * sin invitar a comparar cifras entre empresas, que no son comparables.
 */

type Estado = 'en-meta' | 'fuera-de-meta' | 'sin-datos'

const ESTADOS: Record<Estado, { color: string; texto: string }> = {
  'en-meta': { color: 'var(--success)', texto: 'Dentro de meta' },
  'fuera-de-meta': { color: 'var(--warning)', texto: 'Fuera de meta' },
  'sin-datos': { color: 'var(--text-muted)', texto: 'Sin datos cargados' },
}

export function EmpresaCard({
  empresa,
  resumen,
}: {
  empresa: Empresa
  resumen: ResumenLogistica | null
}) {
  const color = `var(--empresa-${empresa.id})`
  const iniciales = empresa.nombreCorto.slice(0, 2).toUpperCase()

  const estado: Estado =
    resumen === null ? 'sin-datos' : resumen.cumpleMeta ? 'en-meta' : 'fuera-de-meta'
  const { color: colorEstado, texto: textoEstado } = ESTADOS[estado]

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}. ${textoEstado}.`}
      style={{ ['--color-empresa' as string]: color }}
      className="group relative isolate flex min-h-[15rem] flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[color:var(--color-empresa)] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-empresa)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
        className="pointer-events-none absolute -bottom-10 -right-3 -z-10 select-none font-exo text-[9rem] font-bold leading-none opacity-[0.045] transition-opacity duration-300 group-hover:opacity-[0.09]"
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
            {empresa.nombreCorto}
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

        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-5">
          {/* El punto no es el unico portador del mensaje: va acompanado del
              texto, porque el color solo excluye a quien no lo distingue. */}
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: colorEstado }}
          />
          <span className="text-scale-sm" style={{ color: colorEstado }}>
            {textoEstado}
          </span>
        </div>
      </div>
    </Link>
  )
}
