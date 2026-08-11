import { crearClienteServidor } from './supabase-server'

export interface Perfil {
  id: string
  nombre: string
  correo: string
  es_direccion: boolean
  activo: boolean
}

export interface Permiso {
  empresa: string
  area: string
}

export interface Sesion {
  perfil: Perfil | null
  permisos: Permiso[]
  correo: string | null
}

/**
 * Sesion actual con su perfil y permisos.
 *
 * Devuelve todo en nulo o vacio cuando no hay sesion, en vez de lanzar: la
 * fase 2a deja el tablero abierto y una pagina publica no puede caerse
 * porque nadie inicio sesion.
 *
 * perfil viene nulo tambien cuando hay usuario en auth pero nadie le dio de
 * alta su fila en perfiles. Es un estado real y la interfaz debe distinguirlo
 * de "no ha iniciado sesion".
 */
export async function obtenerSesion(): Promise<Sesion> {
  const supabase = crearClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { perfil: null, permisos: [], correo: null }
  }

  const [perfilRes, permisosRes] = await Promise.all([
    supabase
      .from('perfiles')
      .select('id, nombre, correo, es_direccion, activo')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('permisos').select('empresa, area').eq('perfil_id', user.id),
  ])

  const perfil = perfilRes.error ? null : ((perfilRes.data as Perfil | null) ?? null)
  const permisos = permisosRes.error ? [] : ((permisosRes.data as Permiso[]) ?? [])

  return { perfil, permisos, correo: user.email ?? null }
}

/**
 * Decide si la sesion alcanza para ver un area de una empresa.
 *
 * Refleja en TypeScript la misma logica de la funcion tiene_acceso() de
 * Postgres. Postgres sigue siendo la autoridad: esto solo evita pintar
 * enlaces que llevarian a una pantalla vacia.
 */
export function puedeVer(sesion: Sesion, empresa: string, area: string): boolean {
  if (!sesion.perfil || !sesion.perfil.activo) return false
  if (sesion.perfil.es_direccion) return true
  return sesion.permisos.some((p) => p.empresa === empresa && p.area === area)
}
