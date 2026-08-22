'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Tooltip de dato: envuelve un elemento y muestra contenido al pasar el cursor.
 *
 * Distinto de ui/Tooltip, que dibuja su propio icono de informacion y solo
 * acepta texto. Ese explica que es un panel; este dice cuanto vale el elemento
 * que estas senalando. Los dos conviven.
 *
 * Va en portal para que no lo recorte el `overflow-hidden` de las barras.
 */

const RETRASO_MS = 120

type TooltipDatoProps = {
  contenido: ReactNode
  children: ReactNode
  className?: string
}

export function TooltipDato({ contenido, children, className }: TooltipDatoProps) {
  const [visible, setVisible] = useState(false)
  const [montado, setMontado] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const contenedorRef = useRef<HTMLDivElement>(null)
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setMontado(true)
    return () => {
      if (temporizadorRef.current !== undefined) clearTimeout(temporizadorRef.current)
    }
  }, [])

  function calcular() {
    const nodo = contenedorRef.current
    if (!nodo) return
    const caja = nodo.getBoundingClientRect()
    setCoords({
      top: caja.top - 8,
      left: caja.left + caja.width / 2,
    })
  }

  function entrar() {
    calcular()
    temporizadorRef.current = setTimeout(() => setVisible(true), RETRASO_MS)
  }

  function salir() {
    if (temporizadorRef.current !== undefined) clearTimeout(temporizadorRef.current)
    setVisible(false)
  }

  return (
    <div
      ref={contenedorRef}
      className={className}
      onMouseEnter={entrar}
      onMouseLeave={salir}
      onFocus={entrar}
      onBlur={salir}
      tabIndex={0}
    >
      {children}

      {montado &&
        visible &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] max-w-xs -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-scale-xs shadow-xl"
            style={{ top: coords.top, left: coords.left }}
          >
            {contenido}
          </div>,
          document.body,
        )}
    </div>
  )
}
