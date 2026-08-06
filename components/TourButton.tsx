'use client'

import React from 'react'
import { HelpCircle } from 'lucide-react'
import { EVENTO_ABRIR_TOUR } from './Tour'

/**
 * Relanza el recorrido guiado.
 *
 * Existe porque este tablero se consulta cada varias semanas: quien lo vio en
 * marzo no se acuerda en junio. Se comunica con el recorrido por un evento de
 * ventana para no tener que pasar el estado por todo el arbol.
 */
export function TourButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_TOUR))}
      aria-label="Ver el recorrido guiado"
      title="Ver el recorrido guiado"
      className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-bg-surface text-text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <HelpCircle className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
