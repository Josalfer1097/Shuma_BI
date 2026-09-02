'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Lightbulb, X, TrendingDown, TrendingUp, AlertTriangle, Info, ArrowRight } from 'lucide-react'
import type { AccionHallazgo, Hallazgo, Tono } from '@/lib/hallazgosVentas'
import { Tooltip } from '../ui/Tooltip'

/**
 * Panel de hallazgos del periodo.
 *
 * Muestra hechos calculados sobre los datos que ya estan en pantalla, no
 * recomendaciones. Respeta el filtro activo: si el tablero esta filtrado por
 * un canal, los hallazgos hablan de ese canal.
 */

const TONOS: Record<Tono, string> = {
  bueno: 'var(--success)',
  malo: 'var(--warning)',
  neutro: 'var(--text-muted)',
}

const GRUPOS = [
  { tipo: 'cambio' as const, titulo: 'Qué cambió' },
  { tipo: 'atipico' as const, titulo: 'Qué está fuera de lo normal' },
  { tipo: 'dato' as const, titulo: 'Qué conviene saber al leer estos datos' },
]

function IconoHallazgo({ hallazgo }: { hallazgo: Hallazgo }) {
  const color = TONOS[hallazgo.tono]
  const props = { className: 'h-4 w-4 shrink-0', style: { color }, 'aria-hidden': true }
  if (hallazgo.tipo === 'dato') return <Info {...props} />
  if (hallazgo.tipo === 'atipico') return <AlertTriangle {...props} />
  return hallazgo.tono === 'bueno' ? <TrendingDown {...props} /> : <TrendingUp {...props} />
}

export function PanelHallazgos({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const [abierto, setAbierto] = useState(false)
  const [montado, setMontado] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => setMontado(true), [])

  /**
   * Aplica los filtros del hallazgo sobre los que ya estan puestos y
   * cierra el panel.
   *
   * Parte de los parametros actuales en vez de empezar en blanco: si el
   * usuario ya venia mirando un anio, un hallazgo que solo cambia la
   * dimension no tiene por que devolverlo al historico completo.
   */
  function aplicarAccion(accion: AccionHallazgo) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [clave, valor] of Object.entries(accion.params)) {
      if (valor === null) params.delete(clave)
      else params.set(clave, valor)
    }
    setAbierto(false)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [abierto])

  const conAtencion = hallazgos.filter((h) => h.tipo !== 'dato').length

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-border bg-bg-surface px-4 text-scale-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        Qué está pasando
        {conAtencion > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-scale-xs font-semibold text-white">
            {conAtencion}
          </span>
        )}
      </button>

      {montado &&
        abierto &&
        createPortal(
          <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Hallazgos del periodo">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setAbierto(false)}
              className="fixed inset-0 h-full w-full cursor-default bg-[rgba(2,6,16,0.6)]"
            />

            <aside className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-bg-base shadow-2xl sm:w-[26rem]">
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-scale-lg font-semibold text-text-primary">
                    Qué está pasando
                    <Tooltip text="Son cálculos sobre el periodo completo, no sobre el mes filtrado." />
                  </h2>
                  <p className="mt-1 text-scale-xs text-text-muted">
                    Periodo completo, sin importar el mes filtrado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar"
                  className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {hallazgos.length === 0 && (
                  <p className="mt-2 text-scale-sm leading-relaxed text-text-secondary">
                    Con los filtros que tienes aplicados no hay nada que señalar. Varios
                    hallazgos comparan meses entre si, asi que al elegir un mes suelto dejan
                    de poder calcularse.
                  </p>
                )}
                {GRUPOS.map((grupo) => {
                  const items = hallazgos.filter((h) => h.tipo === grupo.tipo)
                  if (items.length === 0) return null
                  return (
                    <section key={grupo.tipo} className="mb-7 last:mb-0">
                      <h3 className="mb-3 text-scale-xs uppercase tracking-wider text-text-muted">
                        {grupo.titulo}
                      </h3>
                      <ul className="space-y-3">
                        {items.map((h, i) => (
                          <li
                            key={i}
                            className="rounded-lg border border-border bg-bg-surface p-4"
                          >
                            <div className="flex items-start gap-2.5">
                              <IconoHallazgo hallazgo={h} />
                              <p className="text-scale-sm font-medium leading-snug text-text-primary">
                                {h.titulo}
                              </p>
                            </div>
                            <p className="mt-2 pl-[1.625rem] text-scale-xs leading-relaxed text-text-muted">
                              {h.detalle}
                            </p>
                            {/*
                              La tarjeta entera NO es el boton. Un bloque de
                              texto largo que ademas es clickable se pulsa sin
                              querer al intentar seleccionar una cifra para
                              copiarla, y aqui las cifras se copian mucho.
                            */}
                            {h.accion && (
                              <button
                                type="button"
                                onClick={() => aplicarAccion(h.accion!)}
                                className="mt-3 ml-[1.625rem] inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-scale-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                {h.accion.etiqueta}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>

              <p className="border-t border-border p-4 text-scale-xs leading-relaxed text-text-muted">
                Todo lo anterior sale de los mismos datos que ves en pantalla. El tablero señala qué
                cambió y qué se sale de lo normal; la explicación de por qué la da la operación.
              </p>
            </aside>
          </div>,
          document.body
        )}
    </>
  )
}
