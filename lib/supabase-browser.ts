import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'

/**
 * Cliente de Supabase para componentes de navegador.
 *
 * Escribe la sesion en cookies, no en localStorage, que es lo que permite
 * que el servidor la lea despues. Es la mitad de navegador del par que forma
 * con crearClienteServidor().
 */
export function crearClienteNavegador() {
  return createBrowserClient(url, anonKey)
}
