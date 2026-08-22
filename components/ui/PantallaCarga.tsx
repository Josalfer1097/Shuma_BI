'use client'

import { useEffect, useState } from 'react'
import { useCargaDiferida } from '@/lib/hooks/useCargaDiferida'

const INTERVALO_MENSAJE_MS = 1800

const MENSAJES_POR_DEFECTO = ['Verificando acceso', 'Cargando permisos', 'Preparando tablero']

type PantallaCargaProps = {
  activo: boolean
  mensajes?: string[]
}

export function PantallaCarga({ activo, mensajes }: PantallaCargaProps) {
  const visible = useCargaDiferida(activo)
  const lista = mensajes && mensajes.length > 0 ? mensajes : MENSAJES_POR_DEFECTO
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!visible) {
      setIndice(0)
      return
    }

    if (indice >= lista.length - 1) return

    const temporizador = setTimeout(() => {
      setIndice((actual) => Math.min(actual + 1, lista.length - 1))
    }, INTERVALO_MENSAJE_MS)

    return () => clearTimeout(temporizador)
  }, [visible, indice, lista.length])

  if (!visible) return null

  return (
    <div
      className="pantalla-carga fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg-base/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 120 140"
        className="h-[108px] w-[92px] text-accent"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="carga-recorte">
            <rect x="24" y="16" width="72" height="96" rx="6" />
          </clipPath>
          <linearGradient id="carga-haz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="45%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect
          x="24"
          y="16"
          width="72"
          height="96"
          rx="6"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="2"
        />

        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line className="carga-renglon" style={{ animationDelay: '0ms' }} x1="38" y1="36" x2="82" y2="36" />
          <line className="carga-renglon" style={{ animationDelay: '120ms' }} x1="38" y1="50" x2="74" y2="50" />
          <line className="carga-renglon" style={{ animationDelay: '240ms' }} x1="38" y1="64" x2="80" y2="64" />
          <line className="carga-renglon" style={{ animationDelay: '360ms' }} x1="38" y1="78" x2="66" y2="78" />
          <line className="carga-renglon" style={{ animationDelay: '480ms' }} x1="38" y1="92" x2="76" y2="92" />
        </g>

        <g clipPath="url(#carga-recorte)">
          <rect className="carga-haz" x="24" width="72" height="34" fill="url(#carga-haz)" />
        </g>
      </svg>

      <p className="text-scale-sm uppercase tracking-[0.18em] text-text-secondary" key={indice}>
        <span className="carga-texto inline-block">{lista[indice]}</span>
      </p>
    </div>
  )
}
