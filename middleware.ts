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
 * Ademas protege: sin sesion, todo redirige a /login. La proteccion vive
 * aqui y no en cada pagina para que agregar una ruta nueva no signifique
 * acordarse de blindarla. Olvidar un archivo es como se filtran los tableros.
 *
 * El middleware es la primera puerta, no la unica: RLS en Postgres es la que
 * de verdad protege los datos. Sin ella, bastaria con llamar a la API de
 * Supabase directo, sin pasar por Next.
 */

/** Rutas alcanzables sin sesion. Todo lo demas exige identidad. */
const RUTAS_PUBLICAS = ['/login', '/auth/callback']
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname
  const esPublica = RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(`${r}/`))

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/login'
    // Se conserva a donde queria ir para devolverlo ahi despues de entrar.
    destino.search = `?next=${encodeURIComponent(ruta + request.nextUrl.search)}`
    return NextResponse.redirect(destino)
  }

  // Con sesion, /login no tiene sentido: manda a la portada.
  if (user && ruta === '/login') {
    const destino = request.nextUrl.clone()
    destino.pathname = '/'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return respuesta
}

export const config = {
  matcher: [
    // Todo menos archivos estaticos e imagenes. Sin esta exclusion el
    // middleware correria en cada icono y fuente, multiplicando latencia.
    '/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
}
