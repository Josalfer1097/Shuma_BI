'use client'

import { useMemo } from 'react'

/**
 * Fondo de la pantalla de acceso.
 *
 * Silueta de barras, retícula técnica y dos resplandores con los colores de
 * las dos empresas. Todo es geometría abstracta: ni un dígito, ni una
 * etiqueta, ni nada con forma de dato. Una cifra inventada aquí, aunque
 * fuera decorativa, es exactamente el error que no puede pasar en un
 * producto que se presenta a dirección.
 *
 * Las alturas se calculan una vez con useMemo. Recalcularlas en cada render
 * haría saltar las barras al escribir en el formulario.
 */
export function FondoAcceso() {
  const barras = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        alto: 18 + ((i * 37) % 62),
        retraso: ((i * 13) % 45) / 10,
        duracion: 3.8 + ((i * 7) % 30) / 10,
      })),
    []
  )

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Retícula técnica, la misma del lenguaje de la portada. */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* Resplandores en los colores de las dos empresas. Identidad del
          grupo, no dato: por eso están difusos y en las esquinas. */}
      <div
        className="animar-deriva absolute -left-32 -top-24 h-[26rem] w-[26rem] rounded-full opacity-[0.20] blur-3xl"
        style={{ backgroundColor: 'var(--empresa-cfs)' }}
      />
      <div
        className="animar-deriva absolute -bottom-32 -right-24 h-[24rem] w-[24rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ backgroundColor: 'var(--empresa-acabados)', animationDelay: '-9s' }}
      />

      {/* Silueta de barras al pie. Muy desenfocada a propósito: sugiere el
          tablero sin poder leerse como uno. */}
      <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center gap-[1.4%] px-[6%] opacity-[0.13] blur-[3px]">
        {barras.map((b, i) => (
          <div
            key={i}
            className="animar-barra flex-1 rounded-t-sm"
            style={{
              height: `${b.alto}%`,
              backgroundColor: 'var(--accent)',
              animationDelay: `-${b.retraso}s`,
              animationDuration: `${b.duracion}s`,
            }}
          />
        ))}
      </div>

      {/* Barrido lento. Un solo elemento en movimiento lineal: es lo que da
          sensación de sistema vivo sin distraer del formulario. */}
      <div
        className="animar-barrido absolute inset-x-0 top-0 h-24"
        style={{
          background:
            'linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent) 22%, transparent), transparent)',
        }}
      />
    </div>
  )
}
