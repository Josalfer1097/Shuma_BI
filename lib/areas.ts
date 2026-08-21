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
    descripcion: 'Colocación, conversión de cotizaciones y comportamiento por zona',
    ruta: '/ventas',
    icono: TrendingUp,
    estado: 'activo',
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

export const AREAS_PENDIENTES = AREAS.filter((a) => a.estado === 'pendiente')

/**
 * Areas activas que NO tienen un panel de resumen propio en la portada.
 *
 * Logistica se excluye porque la portada le dibuja su propio panel con
 * cifras. Las demas activas se muestran como tarjeta con liga, para que
 * activar un area siga siendo cosa de tocar solo este archivo.
 */
const AREAS_CON_PANEL = ['logistica', 'ventas']

export const AREAS_ACTIVAS_SIN_PANEL = AREAS.filter(
  (a) => a.estado === 'activo' && !AREAS_CON_PANEL.includes(a.id),
)
