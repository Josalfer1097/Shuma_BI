import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'

/**
 * Refresco de sesion.
 *
 * El token de Supabase caduca en una hora. Sin este middleware el usuario
 * quedaria fuera a mitad de la jornada, y peor: los Server Components leerian
 * una cookie vencida y devolverian cero filas sin decir por que.
 *
 * FASE 2a: solo refresca. Todavia no bloquea rutas. La proteccion entra en
 * 2b, cuando el login ya este verificado en preview.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesNuevas) {
        cookiesNuevas.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        respuesta = NextResponse.next({ request })
        cookiesNuevas.forEach(({ name, value, options }) => {
          respuesta.cookies.set(name, value, options)
        })
      },
    },
  })

  // getUser y no getSession: getUser valida el token contra Supabase.
  // getSession solo lee la cookie, que el navegador puede haber alterado.
  await supabase.auth.getUser()

  return respuesta
}

export const config = {
  matcher: [
    // Todo menos archivos estaticos e imagenes. Sin esta exclusion el
    // middleware correria en cada icono y fuente, multiplicando latencia.
    '/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
}
