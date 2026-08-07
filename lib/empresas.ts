/**
 * Registro de las empresas del grupo que cubre la plataforma.
 *
 * Agregar una empresa nueva debe requerir tocar solo este archivo, mas su
 * bloque de credenciales en el .env del ETL. Ningun componente conoce una
 * empresa por su nombre.
 *
 * El id coincide con el valor de la columna 'empresa' en Supabase y con el
 * argumento --empresa del ETL. Siempre en minusculas.
 */

export interface Empresa {
  id: string
  /** Nombre completo, para encabezados y documentos. */
  nombre: string
  /** Nombre corto, para el selector y las etiquetas. */
  nombreCorto: string
  /** Siglas reales de la empresa, no un recorte del nombre. */
  siglas: string
  /**
   * Plaza donde opera.
   *
   * Las empresas del grupo comparten giro y se distinguen por razon social y
   * por plaza, asi que no hay una descripcion que agregar: cualquier texto
   * ahi repetiria el nombre o seria inventado. La plaza es lo unico que
   * aporta, y de paso explica por que una maneja zonas de reparto y la otra
   * no.
   */
  plaza: string
  /**
   * Meta de dias comprometida, de la cotizacion a la validacion de entrega.
   * Es distinta por empresa: son operaciones y compromisos distintos.
   */
  metaDias: number
  /**
   * Si la empresa captura zona de entrega.
   *
   * Acabados opera desde Puebla sin dispersion por zonas y su catalogo viene
   * vacio: sus filas salen todas como SIN ZONA. Con esto en false, el modulo
   * oculta el ranking por zona, el filtro de zona y el indicador de zonas
   * fuera de meta, en vez de mostrarlos vacios.
   */
  usaZonas: boolean
}

export const EMPRESAS: Empresa[] = [
  {
    id: 'cfs',
    nombre: 'Comercializadora y Ferretería Shuma',
    nombreCorto: 'Comercializadora',
    siglas: 'CFS',
    plaza: 'Ciudad de México',
    metaDias: 5,
    usaZonas: true,
  },
  {
    id: 'acabados',
    nombre: 'Acabados Shuma',
    nombreCorto: 'Acabados',
    siglas: 'ASH',
    plaza: 'Puebla',
    metaDias: 3,
    usaZonas: false,
  },
]

export const EMPRESA_POR_DEFECTO = 'cfs'

export function buscarEmpresa(id: string | undefined): Empresa | null {
  if (!id) return null
  return EMPRESAS.find((e) => e.id === id.toLowerCase()) ?? null
}
