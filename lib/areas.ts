import type { LucideIcon } from 'lucide-react'
import { Truck, Wallet, TrendingUp, ShoppingCart, Package, Calculator } from 'lucide-react'

/**
 * Registro de las areas de la empresa que cubre la plataforma.
 *
 * Agregar un area nueva debe requerir tocar solo este archivo: la portada
 * recorre AREAS y no conoce ninguna area por su nombre.
 *
 * estado 'pendiente' significa que todavia no hay datos reales. Esas areas
 * se muestran sin cifras a proposito. Nunca poner numeros de ejemplo: el
 * tablero se presenta a direccion y una cifra inventada que se cuele
 * destruye la credibilidad del resto.
 */
export type EstadoArea = 'activo' | 'pendiente'

export interface Area {
  id: string
  nombre: string
  descripcion: string
  ruta: string | null
  icono: LucideIcon
  estado: EstadoArea
  /**
   * Empresas donde el area tiene datos reales.
   *
   * `undefined` significa todas: es el caso normal y no hay que declararlo.
   * Un arreglo restringe el area a esos ids de empresa.
   *
   * Existe porque `estado` es global y los datos no lo son. Ventas cargo
   * primero en CFS: sin esta propiedad, Acabados entra a /acabados/ventas y
   * ve el tablero completo con $0 en cada tarjeta, porque la vista devuelve
   * un arreglo vacio y no un error. Un tablero de ceros parece un dato.
   *
   * Los ids van en minusculas y salen de lib/empresas.ts.
   */
  empresas?: string[]
}

export const AREAS: Area[] = [
  {
    id: 'logistica',
    nombre: 'Logística',
    descripcion: 'Tiempos de entrega desde la cotización hasta la validación',
    ruta: '/logistica',
    icono: Truck,
    estado: 'activo',
  },
  {
    id: 'cxc',
    nombre: 'Crédito y Cobranza',
    descripcion: 'Cartera, antigüedad de saldos y autorizaciones de crédito',
    ruta: null,
    icono: Wallet,
    estado: 'pendiente',
  },
  {
    id: 'ventas',
    nombre: 'Ventas',
    descripcion: 'Cotizaciones, conversión a factura y seguimiento por vendedor',
    ruta: '/ventas',
    icono: TrendingUp,
    estado: 'activo',
    empresas: ['cfs'],
  },
  {
    id: 'compras',
    nombre: 'Compras',
    descripcion: 'Tiempos de reposición y cumplimiento de proveedores',
    ruta: null,
    icono: ShoppingCart,
    estado: 'pendiente',
  },
  {
    id: 'almacen',
    nombre: 'Almacén',
    descripcion: 'Existencias, rotación y exactitud de inventario',
    ruta: null,
    icono: Package,
    estado: 'pendiente',
  },
  {
    id: 'contabilidad',
    nombre: 'Contabilidad',
    descripcion: 'Cierre mensual y conciliaciones',
    ruta: null,
    icono: Calculator,
    estado: 'pendiente',
  },
]

const AREAS_CON_PANEL = ['logistica', 'ventas']

/**
 * Si el area tiene datos reales para esa empresa.
 *
 * Un area sin `empresas` aplica a todas. Es la respuesta unica a
 * "esta area se muestra aqui": la portada, la ruta y cualquier
 * consumidor futuro preguntan lo mismo y no reimplementan la regla.
 */
export function areaDisponible(area: Area, empresaId: string): boolean {
  if (!area.empresas) return true
  return area.empresas.includes(empresaId.toLowerCase())
}

/**
 * Un area activa en el registro pero sin datos para esta empresa se degrada
 * a 'pendiente'. No se oculta: esconderla haria que el grupo de areas
 * cambiara de tamano entre empresas y pareciera un error de carga.
 * Mostrarla como pendiente es la verdad y ya tiene tratamiento visual.
 */
export function areasPendientes(empresaId: string): Area[] {
  return AREAS.filter(
    (a) => a.estado === 'pendiente' || !areaDisponible(a, empresaId),
  )
}

/**
 * Areas activas que NO tienen panel de resumen propio en la portada.
 * Se excluyen las que no tienen datos para la empresa: esas ya salen
 * en `areasPendientes`.
 */
export function areasActivasSinPanel(empresaId: string): Area[] {
  return AREAS.filter(
    (a) =>
      a.estado === 'activo' &&
      areaDisponible(a, empresaId) &&
      !AREAS_CON_PANEL.includes(a.id),
  )
}
