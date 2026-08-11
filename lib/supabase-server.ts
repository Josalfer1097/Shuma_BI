import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'

/**
 * Cliente de Supabase para Server Components y Route Handlers.
 *
 * Lee la sesion de las cookies, asi que las consultas viajan con la identidad
 * del usuario y RLS puede filtrar por auth.uid(). El cliente viejo de
 * lib/supabase.ts no llevaba sesion: toda consulta salia como anonima.
 *
 * Se crea uno por peticion a proposito. Un cliente a nivel de modulo
 * compartiria las cookies del primer visitante con todos los demas.
 */
export function crearClienteServidor() {
  const almacen = cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return almacen.getAll()
      },
      setAll(cookiesNuevas) {
        // Un Server Component no puede escribir cookies. El middleware es
        // quien refresca la sesion, asi que aqui el fallo es esperado y se
        // ignora en lugar de tumbar la pagina.
        try {
          cookiesNuevas.forEach(({ name, value, options }) => {
            almacen.set(name, value, options)
          })
        } catch {
          // Sin accion: el refresco vive en middleware.ts
        }
      },
    },
  })
}
