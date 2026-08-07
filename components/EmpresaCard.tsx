import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Representa una empresa completa, no un area: por eso no lleva cifras. Con
 * credito y cobranza, ventas y compras por entrar, un dato de logistica aqui
 * estaria hablando por todas.
 *
 * Las siglas van CALADAS sobre el bloque de color: el texto no esta pintado
 * encima, es un hueco por el que se ve el fondo de la tarjeta. Por eso no
 * necesita un color de texto por tema ni contraste calculado, se resuelve
 * solo en claro y en oscuro. Se logra con background-clip en el texto sobre
 * un pseudo-fondo del color de la pagina.
 *
 * Encima van tres capas de profundidad, ninguna con imagenes:
 *   1. Degradado diagonal, que da volumen al plano
 *   2. Reflejo curvo en la mitad superior, el brillo del vidrio
 *   3. Barrido de luz que cruza el bloque al pasar el cursor
 *
 * El barrido se desactiva con prefers-reduced-motion; el degradado y el
 * reflejo son estaticos y se quedan.
 */
export function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const color = `var(--empresa-${empresa.id})`

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}`}
      style={{ ['--color-empresa' as string]: color }}
      className="group relative flex min-h-[12rem] overflow-hidden rounded-2xl border border-border bg-bg-surface transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-[color:var(--color-empresa)] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-empresa)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        className="relative isolate flex w-28 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-500 sm:w-36 sm:group-hover:w-40"
        style={{ backgroundColor: color }}
      >
        {/* Capa 1. Degradado diagonal: convierte un plano liso en volumen. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 46%, rgba(0,0,0,0.26) 100%)',
          }}
        />

        {/* Capa 2. Reflejo curvo en la mitad superior. Es lo que lo hace leer
            como vidrio y no como una plasta de color. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-1/4 -top-1/2 h-full w-[150%] rounded-[100%] opacity-40 transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />

        {/* Capa 3. Barrido de luz al pasar el cursor. Cruza una sola vez en
            lugar de repetirse: llama la atencion sin distraer. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 transition-[left] duration-[900ms] ease-out group-hover:left-[150%] motion-reduce:hidden"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Las siglas caladas. El texto toma como relleno el color de fondo de
            la pagina y se recorta a la forma de las letras, asi que parecen
            un hueco en el bloque. */}
        <span
          className="relative z-10 font-exo text-scale-3xl font-bold tracking-wider transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          style={{
            backgroundColor: 'var(--bg-base)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {empresa.siglas}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-6 sm:p-7">
        <h2 className="font-exo text-scale-xl font-semibold leading-tight text-text-primary">
          {empresa.nombre}
        </h2>

        <span className="mt-6 inline-flex items-center gap-1.5 text-scale-sm text-text-muted transition-colors group-hover:text-[color:var(--color-empresa)]">
          Ver indicadores
          <ArrowRight
            className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}
