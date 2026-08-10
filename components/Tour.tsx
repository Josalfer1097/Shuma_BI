'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowLeft, ArrowRight } from 'lucide-react'
import { FontScaleButton } from './FontScaleButton'

/**
 * Recorrido guiado con foco, sin dependencias externas.
 *
 * Las librerias de tours pesan mas que la portada completa de este proyecto,
 * y lo que hace falta aqui es overlay, posicionamiento y refs.
 *
 * El paso apunta a un elemento por su atributo data-tour. Si el elemento no
 * existe en la pagina, el paso se muestra centrado en vez de romperse: asi un
 * cambio de maquetado no deja el recorrido inservible.
 */
export interface PasoTour {
  /** Valor del atributo data-tour del elemento a resaltar. Sin ancla, el paso se centra. */
  ancla?: string
  titulo: string
  cuerpo: string
}

const MARGEN = 12
const ANCHO_GLOBO = 360
/** Alto de referencia antes de que el globo se mida a si mismo. */
const ALTO_ESTIMADO = 260

/** Evento para relanzar el recorrido desde cualquier boton de la pagina. */
export const EVENTO_ABRIR_TOUR = 'shuma-tour:abrir'

interface Recuadro {
  top: number
  left: number
  width: number
  height: number
}

export function Tour({ pasos, llaveStorage }: { pasos: PasoTour[]; llaveStorage: string }) {
  const [montado, setMontado] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [indice, setIndice] = useState(0)
  const [recuadro, setRecuadro] = useState<Recuadro | null>(null)
  const globoRef = useRef<HTMLDivElement>(null)

  const paso = pasos[indice]
  const esUltimo = indice === pasos.length - 1

  // El portal necesita document. Este estado difiere el render al cliente.
  useEffect(() => setMontado(true), [])

  // Autoarranque solo la primera vez. Si localStorage no esta disponible
  // (navegacion privada), el recorrido simplemente no arranca solo.
  useEffect(() => {
    try {
      if (!localStorage.getItem(llaveStorage)) setAbierto(true)
    } catch {
      /* sin almacenamiento: no autoarranca */
    }
  }, [llaveStorage])

  // Relanzado desde el boton de ayuda del encabezado.
  useEffect(() => {
    const abrir = () => {
      setIndice(0)
      setAbierto(true)
    }
    window.addEventListener(EVENTO_ABRIR_TOUR, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_TOUR, abrir)
  }, [])

  const cerrar = useCallback(() => {
    setAbierto(false)
    try {
      localStorage.setItem(llaveStorage, 'visto')
    } catch {
      /* sin almacenamiento: se volvera a mostrar */
    }
  }, [llaveStorage])

  const medir = useCallback(() => {
    if (!paso?.ancla) {
      setRecuadro(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${paso.ancla}"]`)
    if (!el) {
      setRecuadro(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRecuadro({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [paso])

  // Lleva el elemento a la vista y luego mide. El scroll suave se omite
  // cuando el sistema pide movimiento reducido.
  useLayoutEffect(() => {
    if (!abierto || !paso) return

    const el = paso.ancla
      ? document.querySelector<HTMLElement>(`[data-tour="${paso.ancla}"]`)
      : null

    if (el) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Centrar un elemento alto lo deja sin hueco arriba ni abajo, y el globo
      // acaba encimado sobre lo que explica. Alinearlo al borde superior libera
      // la mitad inferior de la pantalla.
      const esAlto = el.getBoundingClientRect().height > window.innerHeight * 0.5
      el.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: esAlto ? 'start' : 'center',
      })
    }

    medir()
    const t = window.setTimeout(medir, 400) // tras terminar el scroll suave
    return () => window.clearTimeout(t)
  }, [abierto, paso, medir])

  useEffect(() => {
    if (!abierto) return
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [abierto, medir])

  useEffect(() => {
    if (!abierto) return
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      else if (e.key === 'ArrowRight' && !esUltimo) setIndice((i) => i + 1)
      else if (e.key === 'ArrowLeft' && indice > 0) setIndice((i) => i - 1)
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [abierto, cerrar, esUltimo, indice])

  useEffect(() => {
    if (abierto) globoRef.current?.focus()
  }, [abierto, indice])

  // El alto real del globo solo se conoce despues de pintarlo, y ademas cambia
  // cuando el usuario sube la escala de texto desde el boton del propio globo.
  // El observador reposiciona con la medida real en vez de la estimada.
  const [altoGlobo, setAltoGlobo] = useState(ALTO_ESTIMADO)
  useLayoutEffect(() => {
    const el = globoRef.current
    if (!abierto || !el) return
    const aplicar = () => setAltoGlobo(el.offsetHeight)
    aplicar()
    const observador = new ResizeObserver(aplicar)
    observador.observe(el)
    return () => observador.disconnect()
  }, [abierto, indice])

  if (!montado || !abierto || !paso) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const ancho = Math.min(ANCHO_GLOBO, vw - MARGEN * 2)

  // Orden de preferencia: debajo, arriba, a la derecha, a la izquierda.
  //
  // Antes el ultimo caso centraba el globo en la pantalla, y como el elemento
  // tambien queda centrado por el scroll, el globo aterrizaba justo encima de
  // lo que explicaba. Ahora se ancla al borde con mas espacio: se encima lo
  // menos posible y el encabezado del elemento sigue visible.
  let estiloGlobo: React.CSSProperties
  if (recuadro) {
    const alto = altoGlobo
    const espacioAbajo = vh - (recuadro.top + recuadro.height)
    const espacioArriba = recuadro.top
    const espacioDerecha = vw - (recuadro.left + recuadro.width)
    const espacioIzquierda = recuadro.left

    const centradoEnX = Math.min(
      Math.max(MARGEN, recuadro.left + recuadro.width / 2 - ancho / 2),
      Math.max(MARGEN, vw - ancho - MARGEN)
    )
    const centradoEnY = Math.min(
      Math.max(MARGEN, recuadro.top + recuadro.height / 2 - alto / 2),
      Math.max(MARGEN, vh - alto - MARGEN)
    )

    if (espacioAbajo >= alto + MARGEN * 2) {
      estiloGlobo = {
        top: recuadro.top + recuadro.height + MARGEN,
        left: centradoEnX,
        width: ancho,
      }
    } else if (espacioArriba >= alto + MARGEN * 2) {
      estiloGlobo = { top: recuadro.top - alto - MARGEN, left: centradoEnX, width: ancho }
    } else if (espacioDerecha >= ancho + MARGEN * 2) {
      estiloGlobo = {
        top: centradoEnY,
        left: recuadro.left + recuadro.width + MARGEN,
        width: ancho,
      }
    } else if (espacioIzquierda >= ancho + MARGEN * 2) {
      estiloGlobo = { top: centradoEnY, left: recuadro.left - ancho - MARGEN, width: ancho }
    } else {
      estiloGlobo = {
        top: espacioAbajo >= espacioArriba ? Math.max(MARGEN, vh - alto - MARGEN) : MARGEN,
        left: centradoEnX,
        width: ancho,
      }
    }
  } else {
    estiloGlobo = {
      top: '50%',
      left: '50%',
      width: ancho,
      transform: 'translate(-50%, -50%)',
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998]"
      role="dialog"
      aria-modal="true"
      aria-label="Recorrido guiado"
    >
      {/* Sin ancla, el fondo es una capa simple. Con ancla, el hueco se logra
          con una sombra enorme alrededor del recuadro resaltado. */}
      {recuadro ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-accent"
          style={{
            top: recuadro.top - 4,
            left: recuadro.left - 4,
            width: recuadro.width + 8,
            height: recuadro.height + 8,
            boxShadow: '0 0 0 9999px rgba(2, 6, 16, 0.72)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(2,6,16,0.72)]" />
      )}

      {/* Capa de cierre al tocar fuera. Va debajo del globo. */}
      <button
        type="button"
        aria-label="Cerrar recorrido"
        onClick={cerrar}
        className="fixed inset-0 h-full w-full cursor-default"
      />

      <div
        ref={globoRef}
        tabIndex={-1}
        className="fixed rounded-lg border border-border bg-bg-surface p-5 shadow-2xl focus:outline-none"
        style={estiloGlobo}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="text-scale-xs uppercase tracking-wide text-text-muted">
            Paso {indice + 1} de {pasos.length}
          </span>
          <div className="flex items-center gap-1 -mr-2 -mt-2">
            <FontScaleButton />
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar recorrido"
              className="flex h-11 w-11 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <h3 className="text-scale-lg font-semibold text-text-primary">{paso.titulo}</h3>
        <p className="mt-2 text-scale-sm leading-relaxed text-text-secondary">{paso.cuerpo}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {pasos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === indice ? 'bg-accent' : 'bg-border'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setIndice((i) => i - 1)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-scale-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={() => (esUltimo ? cerrar() : setIndice((i) => i + 1))}
              className="flex min-h-[44px] items-center gap-1.5 rounded-md bg-accent px-4 text-scale-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {esUltimo ? 'Entendido' : 'Siguiente'}
              {!esUltimo && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
