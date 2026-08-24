'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { cerrarSesion } from '@/app/acciones/sesion'

interface Props {
  /** Nulo cuando no hay sesion. */
  nombre: string | null
}

/**
 * Entrar o salir, segun haya sesion.
 *
 * El nombre lo calcula el servidor y llega como prop. Consultarlo aqui
 * provocaria un parpadeo de "sin sesion" en cada carga.
 */
export function BotonSesion({ nombre }: Props) {
  const router = useRouter()
  const [saliendo, iniciarSalida] = useTransition()

  /**
   * El cierre de sesion corre en el servidor, no aqui.
   *
   * signOut() del cliente de navegador no puede borrar las cookies que
   * escribio el servidor, asi que dejaba un refresh token muerto y la
   * siguiente carga fallaba con `refresh_token_not_found`.
   *
   * useTransition da el estado de "saliendo" sin necesidad de un useState
   * propio, y la Server Action se encarga del redirect a /login.
   */
  function salir() {
    iniciarSalida(() => {
      void cerrarSesion()
    })
  }

  if (!nombre) {
    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-scale-sm text-text-secondary hover:text-text-primary transition-colors"
        title="Iniciar sesión"
      >
        <LogIn size={16} aria-hidden="true" />
        Entrar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-scale-sm text-text-muted hidden sm:inline">{nombre}</span>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-scale-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        title="Cerrar sesión"
      >
        {saliendo ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogOut size={16} aria-hidden="true" />
        )}
        <span className="sr-only sm:not-sr-only">Salir</span>
      </button>
    </div>
  )
}
