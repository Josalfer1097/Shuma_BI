'use client'

import { useMemo } from 'react'

/**
 * Fondo de la pantalla de acceso.
 *
 * La pantalla de acceso es del GRUPO, no de una empresa: llega antes de que
 * el usuario elija. Por eso sostiene los dos colores de identidad en tension
 * -- marino a la izquierda, escarlata a la derecha -- en vez de comprometerse
 * con uno. Es la unica pantalla del producto donde eso tiene sentido.
 *
 * Todo es geometria abstracta: ni un digito, ni una etiqueta, ni nada con
 * forma de dato. Una cifra decorativa aqui, aunque fuera inventada a
 * proposito, es el error mas caro posible en un tablero que se presenta a
 * direccion.
 */
export function FondoAcceso() {
  // Calculado una vez: recalcularlo en cada render haria saltar las barras
  // al escribir en el formulario.
  const barras = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        alto: 14 + ((i * 41) % 66),
        retraso: ((i * 17) % 52) / 10,
        duracion: 4.2 + ((i * 11) % 34) / 10,
      })),
    []
  )

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Cama de color. Marino y escarlata en extremos opuestos: el grupo
          contiene a las dos empresas sin ser ninguna. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 12% 8%, color-mix(in srgb, var(--empresa-cfs-masa) 78%, transparent), transparent 62%),' +
            'radial-gradient(110% 85% at 92% 96%, color-mix(in srgb, var(--empresa-acabados-masa) 46%, transparent), transparent 58%),' +
            'var(--bg-base)',
        }}
      />

      {/* Retícula técnica, el mismo lenguaje de la portada. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Resplandores a la deriva, uno por empresa. */}
      <div
        className="animar-deriva absolute -left-40 -top-32 h-[34rem] w-[34rem] rounded-full opacity-25 blur-[110px]"
        style={{ backgroundColor: 'var(--empresa-cfs)' }}
      />
      <div
        className="animar-deriva absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full opacity-[0.18] blur-[110px]"
        style={{ backgroundColor: 'var(--empresa-acabados)', animationDelay: '-9s' }}
      />

      {/* Silueta de barras al pie. Muy desenfocada a proposito: sugiere el
          tablero sin poder leerse como uno. */}
      <div className="animar-pulso absolute inset-x-0 bottom-0 flex h-[45%] items-end justify-center gap-[1.1%] px-[4%] blur-[4px]">
        {barras.map((b, i) => (
          <div
            key={i}
            className="animar-barra flex-1 rounded-t"
            style={{
              height: `${b.alto}%`,
              background:
                'linear-gradient(180deg, var(--text-primary), color-mix(in srgb, var(--text-primary) 10%, transparent))',
              animationDelay: `-${b.retraso}s`,
              animationDuration: `${b.duracion}s`,
            }}
          />
        ))}
      </div>

      {/* Barrido lento. Un solo elemento en movimiento lineal: da sensacion
          de sistema vivo sin competir con el formulario. */}
      <div
        className="animar-barrido absolute inset-x-0 top-0 h-28"
        style={{
          background:
            'linear-gradient(180deg, transparent, color-mix(in srgb, var(--text-primary) 14%, transparent), transparent)',
        }}
      />

      {/* Vineta: apaga las esquinas para que el centro pese mas. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(72% 58% at 50% 45%, transparent, color-mix(in srgb, var(--bg-base) 88%, transparent) 100%)',
        }}
      />
    </div>
  )
}
