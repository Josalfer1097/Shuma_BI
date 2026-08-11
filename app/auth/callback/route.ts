import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase-server'

/**
 * Aterrizaje del enlace magico.
 *
 * Supabase manda al usuario aqui con un codigo de un solo uso. Se canjea por
 * la sesion y se redirige. Sin este canje el enlace no deja sesion y el
 * usuario vuelve al login sin entender por que.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const codigo = searchParams.get('code')
  const destino = searchParams.get('next') || '/'

  if (!codigo) {
    return NextResponse.redirect(`${origin}/login?error=sin_codigo`)
  }

  const supabase = crearClienteServidor()
  const { error } = await supabase.auth.exchangeCodeForSession(codigo)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=enlace_invalido`)
  }

  // destino se filtra a rutas internas: un ?next=https://otro-sitio
  // convertiria el enlace de acceso en un redirector abierto.
  const seguro = destino.startsWith('/') && !destino.startsWith('//') ? destino : '/'
  return NextResponse.redirect(`${origin}${seguro}`)
}
