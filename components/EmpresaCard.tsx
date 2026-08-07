import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Representa una empresa completa, no un area. Por eso no lleva cifras ni
 * estado ni descripcion de un modulo: cuando entren credito y cobranza,
 * ventas y compras, cualquier dato de logistica aqui estaria hablando de una
 * sexta parte del contenido como si fuera el todo.
 *
 * Queda identidad pura: color, monograma y nombre. Y como es lo unico que
 * hay en la pantalla, el trabajo visual se concentra aqui.
 */
export function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const color = `var(--empresa-${empresa.id})`
  const iniciales = empresa.nombreCorto.slice(0, 2).toUpperCase()

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}`}
      style={{ ['--color-empresa' as string]: color }}
      className="group relative isolate flex min-h-[20rem] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-bg-surface p-8 transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1.5 hover:border-[color:var(--color-empresa)] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-empresa)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Barrido diagonal en el color de la empresa. Ocupa la tarjeta
          completa en lugar de una franja: es lo que la distingue de lejos. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.10] transition-opacity duration-500 group-hover:opacity-[0.22]"
        style={{
          background: `linear-gradient(135deg, ${'var(--color-empresa)'} 0%, transparent 62%)`,
        }}
      />

      {/* Trama de lineas finas. Da materia a la superficie sin competir con
          nada; a esta opacidad casi no se ve, y esa es la intencion. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 11px)',
          color: 'var(--color-empresa)',
        }}
      />

      <div className="flex items-start justify-between gap-4">
        {/* Monograma dentro de su propia caja: contenido, no recortado por el
            borde de la tarjeta. */}
        <span
          aria-hidden="true"
          className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border font-exo text-scale-2xl font-bold tracking-tight transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          style={{
            color,
            borderColor: color + '4D',
            backgroundColor: color + '1A',
          }}
        >
          {iniciales}
        </span>

        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition-all duration-500 group-hover:border-[color:var(--color-empresa)] group-hover:bg-[color:var(--color-empresa)] group-hover:text-bg-base"
          aria-hidden="true"
        >
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" />
        </span>
      </div>

      <div>
        {/* Linea de acento que crece al pasar el cursor. Un solo gesto que
            confirma que la tarjeta responde. */}
        <span
          aria-hidden="true"
          className="mb-5 block h-0.5 w-10 rounded-full transition-all duration-500 group-hover:w-20"
          style={{ backgroundColor: color }}
        />
        <h2 className="font-exo text-scale-3xl font-bold leading-[1.1] tracking-tight text-text-primary">
          {empresa.nombre}
        </h2>
      </div>
    </Link>
  )
}
