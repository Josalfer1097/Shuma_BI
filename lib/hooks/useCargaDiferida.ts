'use client'

import { useEffect, useRef, useState } from 'react'

const RETRASO_MS = 300
const MINIMO_MS = 400

/**
 * Devuelve true solo cuando vale la pena mostrar un indicador de carga.
 *
 * Regla 1: si `activo` dura menos de RETRASO_MS, nunca devuelve true.
 *          Evita el parpadeo en conexiones buenas.
 * Regla 2: si ya devolvio true, se mantiene al menos MINIMO_MS.
 *          Evita el estrobo cuando la respuesta llega justo despues.
 */
export function useCargaDiferida(activo: boolean): boolean {
  const [visible, setVisible] = useState(false)
  const mostradoEn = useRef<number | null>(null)

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined

    if (activo) {
      temporizador = setTimeout(() => {
        mostradoEn.current = Date.now()
        setVisible(true)
      }, RETRASO_MS)

      return () => {
        if (temporizador !== undefined) clearTimeout(temporizador)
      }
    }

    if (mostradoEn.current === null) {
      setVisible(false)
      return
    }

    const transcurrido = Date.now() - mostradoEn.current
    const restante = Math.max(0, MINIMO_MS - transcurrido)

    temporizador = setTimeout(() => {
      mostradoEn.current = null
      setVisible(false)
    }, restante)

    return () => {
      if (temporizador !== undefined) clearTimeout(temporizador)
    }
  }, [activo])

  return visible
}
