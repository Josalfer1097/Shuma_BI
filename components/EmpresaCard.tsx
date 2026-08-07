import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Empresa } from '@/lib/empresas'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Representa una empresa completa, no un area. Por eso no lleva cifras: con
 * credito y cobranza, ventas y compras por entrar, un dato de logistica aqui
 * estaria hablando por todas.
 *
 * Composicion de panel dividido: bloque solido de color con las siglas a la
 * izquierda, nombre a la derecha. El bloque resuelve dos problemas de la
 * version anterior, el vacio del centro y un color que apenas se percibia, sin
 * recurrir a degradados ni efectos. Y escala: puestas en columna, los bloques
 * forman una franja lateral que se lee como indice.
 */
export function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const color = `var(--empresa-${empresa.id})`

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}`}
      style={{ ['--color-empresa' as string]: color }}
      className="group flex min-h-[11rem] overflow-hidden rounded-xl border border-border bg-bg-surface transition-[border-color,box-shadow] duration-300 hover:border-[color:var(--color-empresa)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-empresa)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
    >
      {/* Bloque solido con las siglas reales de la empresa, no un recorte del
          nombre: son CFS y ASH, no "CO" y "AC". */}
      <div
        className="flex w-24 shrink-0 items-center justify-center transition-[width] duration-300 group-hover:w-28 sm:w-28 sm:group-hover:w-32"
        style={{ backgroundColor: color }}
      >
        <span
          className="font-exo text-scale-xl font-bold tracking-wide"
          style={{ color: `var(--sobre-empresa-${empresa.id})` }}
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
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}
