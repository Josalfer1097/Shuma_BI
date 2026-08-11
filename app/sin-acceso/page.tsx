import Link from 'next/link'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { obtenerSesion } from '@/lib/auth'

export const revalidate = 0

export const metadata = { title: 'Sin acceso | Tablero Operativo Shuma' }

/**
 * Aterrizaje de quien tiene sesion pero no permiso sobre lo que pidio.
 *
 * Se eligio esto sobre devolver 404. El 404 no revela que el area exista,
 * pero aqui todos son empleados y el caso comun es un enlace compartido de
 * mas, no un intento de intrusion. Una pantalla que explica ahorra un ticket;
 * un 404 lo genera.
 *
 * Distingue dos casos que se sienten igual y no lo son: no tener permisos
 * asignados todavia, y tener permisos pero no sobre esto.
 */
export default async function SinAcceso() {
  const sesion = await obtenerSesion()
  const sinPerfil = !sesion.perfil
  const sinPermisos = !!sesion.perfil && !sesion.perfil.es_direccion && sesion.permisos.length === 0

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="animar-entrada w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-surface">
          <ShieldOff size={24} className="text-text-muted" aria-hidden="true" />
        </div>

        <h1 className="font-exo text-scale-2xl font-bold text-text-primary">Sin acceso</h1>

        <p className="mt-3 text-scale-base text-text-secondary">
          {sinPerfil
            ? 'Tu cuenta existe pero todavía no tiene un perfil dado de alta. Escribe a sistemas para que te lo asignen.'
            : sinPermisos
              ? 'Tu perfil todavía no tiene áreas asignadas. Escribe a sistemas indicando qué necesitas consultar.'
              : 'Esta área no está dentro de tus permisos. Si crees que debería estarlo, escribe a sistemas.'}
        </p>

        {sesion.correo && (
          <p className="mt-4 font-mono text-scale-xs tracking-[0.14em] text-text-muted">
            {sesion.correo}
          </p>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex min-h-[44px] items-center gap-1.5 rounded text-scale-sm text-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
