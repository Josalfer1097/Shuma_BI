'use server'

import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase-server'

/**
 * Cierra la sesion desde el SERVIDOR. No es un capricho de arquitectura.
 *
 * Con @supabase/ssr la sesion vive en cookies que escribe el servidor
 * (middleware.ts las refresca en cada peticion). Un signOut() ejecutado en el
 * navegador borra lo que el navegador controla, pero NO puede borrar esas
 * cookies. El resultado era que tras "salir" quedaba una cookie con un
 * refresh token ya invalidado, y la siguiente carga fallaba con
 * `refresh_token_not_found` (400) en los logs, en / y en /login.
 *
 * Aqui si se pueden escribir cookies: una Server Action tiene el almacen en
 * modo escritura, a diferencia de un Server Component. Por eso
 * `crearClienteServidor` funciona sin tocarse: su try/catch, que existe para
 * tragarse el fallo en Server Components, simplemente nunca se dispara en
 * este contexto.
 *
 * El redirect va DESPUES del signOut y fuera del try: `redirect` funciona
 * lanzando una excepcion que Next intercepta, asi que envolverlo en un
 * try/catch se la comeria y la navegacion nunca ocurriria.
 */
export async function cerrarSesion() {
  const supabase = crearClienteServidor()

  // scope 'local' revoca solo esta sesion. 'global' cerraria la sesion del
  // usuario en todos sus dispositivos, que no es lo que espera quien le da
  // clic a "Salir" en una computadora compartida de la oficina.
  await supabase.auth.signOut({ scope: 'local' })

  redirect('/login')
}
