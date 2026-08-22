import { formatDecimal, formatNumber } from './format'

/**
 * Capa de metricas del modulo de Ventas.
 *
 * Todas las reglas de negocio del area viven aqui, como funciones. La
 * capa visual consume estas funciones y NO deriva metricas por su cuenta.
 *
 * La razon es concreta: en ventas casi todo error produce un numero
 * creible. Una conversion mal calculada no se ve rota, se ve razonable,
 * y llega a direccion sin que nadie la cuestione. Poner la regla en
 * codigo la hace verificable; dejarla en la documentacion la hace
 * opcional.
 *
 * Cada regla trae la evidencia de por que existe. Salieron de auditar
 * 20 meses de datos reales contra el ERP.
 */

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

/** Los cuatro canales. El orden es el de presentacion. */
export const CANALES = ['externo', 'mostrador', 'intercompania', 'interno'] as const
export type Canal = (typeof CANALES)[number]

export const DIMENSIONES = ['cliente', 'producto', 'vendedor'] as const
export type Dimension = (typeof DIMENSIONES)[number]

/** Etiquetas de canal para pantalla. */
export const ETIQUETA_CANAL: Record<Canal, string> = {
  externo: 'Cliente con ficha',
  mostrador: 'Mostrador',
  intercompania: 'Intercompañía',
  interno: 'Interno',
}

/** Fila cruda de ventas_agregado, tal como llega de Supabase. */
export interface VentaRow {
  empresa: string
  /** ISO YYYY-MM-DD. En dimension 'producto' siempre es dia 1 del mes. */
  fecha_cotizacion: string
  canal: Canal
  dimension: Dimension
  dimension_id: string
  dimension_codigo: string
  dimension_nombre: string

  reng_cotizados: number
  reng_facturados: number
  imp_cotizado: number
  imp_facturado: number
  imp_cot_convertido: number
  imp_en_proceso: number
  imp_sin_seguimiento: number
  imp_suspendido: number
  imp_cancelado: number
  imp_reng_max: number
  cant_reng_max: number
  cotizaciones: number
  cotiz_sin_seguimiento: number
  art_reng_max: string
  reng_max_convertido: number
  ultima_factura: string | null

  actualizado_en: string
}

/**
 * Fila de v_ventas_mensual. Es lo que consulta el tablero por default:
 * unas 60 filas por empresa, muy por debajo del limite de PostgREST.
 */
export interface FilaMensual {
  empresa: string
  /** YYYY-MM */
  anio_mes: string
  canal: Canal
  reng_cotizados: number
  reng_facturados: number
  imp_cotizado: number
  imp_facturado: number
  imp_cot_convertido: number
  imp_en_proceso: number
  imp_sin_seguimiento: number
  imp_suspendido: number
  imp_cancelado: number
  cotizaciones: number
  cotiz_sin_seguimiento: number
  cotiz_suspendidas: number
  cotiz_canceladas: number
  imp_reng_max: number
  cant_reng_max: number
  art_reng_max: string
  reng_max_convertido: number
}

/**
 * Fila de v_ventas_ranking: totales por entidad y canal.
 *
 * OJO — esta vista pasa de 1,000 filas. PostgREST corta ahi y
 * devuelve codigo 200 sin error, asi que el dato incompleto se ve
 * exactamente igual que el completo. Hay que paginar con .range()
 * en bloques de 1,000 hasta recibir un bloque incompleto.
 */
export interface FilaRankingVista {
  empresa: string
  dimension: Dimension
  dimension_id: string
  canal: Canal
  dimension_codigo: string
  dimension_nombre: string
  reng_cotizados: number
  reng_facturados: number
  imp_cotizado: number
  imp_facturado: number
  imp_cot_convertido: number
  imp_en_proceso: number
  imp_sin_seguimiento: number
  imp_suspendido: number
  imp_cancelado: number
  cotizaciones: number
  cotiz_sin_seguimiento: number
  cotiz_suspendidas: number
  cotiz_canceladas: number
  imp_reng_max: number
  cant_reng_max: number
  art_reng_max: string
  reng_max_convertido: number
  ultima_actividad: string
  ultima_factura: string | null
}

/** Cualquier fila con metricas de ventas: cruda o de vista. */
export type FilaMetrica = VentaRow | FilaMensual | FilaRankingVista

export interface KpisVentas {
  impFacturado: number
  impCotizado: number
  impEnProceso: number
  impSinSeguimiento: number
  impSuspendido: number
  impCancelado: number
  /** Renglones que llegaron a factura / renglones cotizados. */
  convRenglonesPct: number
  /** Importe cotizado de lo que si se facturo / importe cotizado. */
  convImportePct: number
  renglones: number
  /**
   * null cuando la dimension es 'producto'. Ver reglaCotizacionesSumables.
   */
  cotizaciones: number | null
  sinSeguimientoPct: number | null
  cotizSinSeguimiento: number | null
  impRenglonMax: number
  cantRenglonMax: number
  artRenglonMax: string
  renglonMaxConvertido: number
}

// ------------------------------------------------------------------
// Reglas de canal
// ------------------------------------------------------------------

/**
 * REGLA — 'interno' se excluye siempre, en toda vista y todo calculo.
 *
 * Son cuentas comodin del ERP (688 COTIZACIONES SHUMA, 1276 SHUMA
 * AJUSCO) con RFC vacio y cero movimiento. Estan etiquetadas para que
 * si alguien las revive no entren como venta externa.
 */
export function excluirInterno<T extends { canal: Canal }>(rows: T[]): T[] {
  return rows.filter((r) => r.canal !== 'interno')
}

/**
 * REGLA — 'intercompania' se muestra con su etiqueta, nunca suma al
 * consolidado del grupo.
 *
 * Son ventas entre empresas de Shuma. Si entran como cliente normal,
 * direccion ve dinero que a nivel grupo no existe. Convierten cerca del
 * 98% por importe, asi que ademas inflan cualquier promedio en el que
 * se cuelen.
 */
export function soloVentaExterna<T extends { canal: Canal }>(rows: T[]): T[] {
  return rows.filter((r) => r.canal !== 'interno' && r.canal !== 'intercompania')
}

/**
 * REGLA — 'mostrador' no se promedia con 'externo' en una misma
 * tarjeta de conversion.
 *
 * Mostrador son cuentas genericas de piso: detras hay 3,705 RFC
 * distintos que solo se identifican al facturar. Es venta a cliente
 * ocasional, no a cliente con ficha, y hay dias sueltos donde una
 * cuenta generica cotiza decenas de millones y factura miles.
 *
 * Devuelve las series separadas. Usala en lugar de agregar por encima.
 */
export function separarPorCanal<T extends { canal: Canal }>(
  rows: T[],
): Record<Canal, T[]> {
  const salida: Record<Canal, T[]> = {
    externo: [],
    mostrador: [],
    intercompania: [],
    interno: [],
  }
  for (const r of rows) salida[r.canal].push(r)
  return salida
}

// ------------------------------------------------------------------
// Reglas de agregacion
// ------------------------------------------------------------------

/**
 * REGLA — 'cotizaciones' NO es sumable en la dimension 'producto'.
 *
 * Una cotizacion de 10 articulos aparece en 10 filas de producto, asi
 * que sumarla da 10x. Solo es sumable en 'cliente' y en 'vendedor',
 * donde cada cotizacion aparece una vez.
 *
 * Lo mismo aplica a cotiz_sin_seguimiento, suspendidas y canceladas:
 * los cuatro son conteos a nivel cotizacion.
 */
export function cotizacionesSumables(dimension: Dimension | null): boolean {
  return dimension !== 'producto'
}

/**
 * REGLA — la conversion por importe NUNCA se calcula como
 * imp_facturado / imp_cotizado.
 *
 * El precio puede subir entre la cotizacion y la factura: el ERP
 * suspende sola una cotizacion a los 10 dias, y al revivirla toma lista
 * de precios nueva. Esa razon pasa del 100% y ya hay un vendedor con
 * 115%. El unico numerador valido es imp_cot_convertido, que es el
 * importe COTIZADO de los renglones que si llegaron a factura.
 */
function conversionImporte(impCotConvertido: number, impCotizado: number): number {
  if (impCotizado <= 0) return 0
  return (impCotConvertido / impCotizado) * 100
}

function conversionRenglones(facturados: number, cotizados: number): number {
  if (cotizados <= 0) return 0
  return (facturados / cotizados) * 100
}

/**
 * Calcula los KPI de un conjunto de filas.
 *
 * `dimension` decide si las metricas a nivel cotizacion son validas.
 * Pasa null si las filas mezclan dimensiones, y quedaran en null por
 * seguridad.
 */
export function calcularKpis(
  rows: FilaMetrica[],
  dimension: Dimension | null,
): KpisVentas | null {
  const filas = excluirInterno(rows)
  if (filas.length === 0) return null

  const sum = (k: keyof FilaMensual) =>
    filas.reduce((acc, curr) => acc + ((curr as unknown as Record<string, unknown>)[k] as number || 0), 0)
  // Ojo: no es la suma, es el articulo y valor de la fila con mayor importe de renglon
  const dominanteReng = filas.reduce((a, b) =>
    b.imp_reng_max > a.imp_reng_max ? b : a,
  )

  const impFacturado = sum('imp_facturado')
  const impCotizado = sum('imp_cotizado')
  const impEnProceso = sum('imp_en_proceso')
  const impSinSeguimiento = sum('imp_sin_seguimiento')
  const impSuspendido = sum('imp_suspendido')
  const impCancelado = sum('imp_cancelado')

  const sumables = cotizacionesSumables(dimension) && dimension !== null
  const cotizaciones = sumables ? sum('cotizaciones') : null
  const sinSeguimiento = sumables ? sum('cotiz_sin_seguimiento') : null

  return {
    impFacturado,
    impCotizado,
    impEnProceso,
    impSinSeguimiento,
    impSuspendido,
    impCancelado,
    convRenglonesPct: conversionRenglones(
      sum('reng_facturados'),
      sum('reng_cotizados'),
    ),
    convImportePct: conversionImporte(sum('imp_cot_convertido'), impCotizado),
    renglones: sum('reng_cotizados'),
    cotizaciones,
    cotizSinSeguimiento: sinSeguimiento,
    sinSeguimientoPct:
      cotizaciones && cotizaciones > 0 && sinSeguimiento !== null
        ? (sinSeguimiento / cotizaciones) * 100
        : null,
    impRenglonMax: dominanteReng.imp_reng_max,
    cantRenglonMax: dominanteReng.cant_reng_max,
    artRenglonMax: dominanteReng.art_reng_max,
    renglonMaxConvertido: dominanteReng.reng_max_convertido,
  }
}

// ------------------------------------------------------------------
// Series de tiempo
// ------------------------------------------------------------------

export interface PuntoSerie {
  anioMes: string
  impCotizado: number
  impFacturado: number
  convRenglonesPct: number
  convImportePct: number
  cotizaciones: number | null
  cotizSinSeguimiento: number | null
}

/** YYYY-MM-DD -> YYYY-MM. */
export function aMes(fechaIso: string): string {
  return fechaIso.slice(0, 7)
}

/**
 * REGLA — la dimension 'producto' esta a grano MENSUAL, no diario.
 *
 * A grano diario producto son 227,088 filas contra 29,809 de cliente:
 * el 85% de la tabla para una cola larga de casi 7,000 articulos que
 * nadie consulta por dia. En la tabla, fecha_cotizacion guarda el dia 1
 * del mes cuando la dimension es 'producto'.
 *
 * La serie diaria sale completa de la dimension 'cliente', que suma
 * identico. Nunca construyas una serie diaria desde producto.
 */
export function soportaSerieDiaria(dimension: Dimension): boolean {
  return dimension !== 'producto'
}

/**
 * Serie mensual desde las filas de v_ventas_mensual.
 *
 * Es el camino por default del tablero: la vista ya viene agregada y
 * son unas 60 filas, asi que no hay riesgo de truncamiento.
 */
export function serieMensualDesdeVista(filas: FilaMensual[]): PuntoSerie[] {
  const porMes = new Map<string, FilaMensual[]>()
  for (const r of excluirInterno(filas)) {
    const acc = porMes.get(r.anio_mes)
    if (acc) acc.push(r)
    else porMes.set(r.anio_mes, [r])
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anioMes, grupo]) => {
      const k = calcularKpis(grupo, 'cliente')!
      return {
        anioMes,
        impCotizado: k.impCotizado,
        impFacturado: k.impFacturado,
        convRenglonesPct: k.convRenglonesPct,
        convImportePct: k.convImportePct,
        cotizaciones: k.cotizaciones,
        cotizSinSeguimiento: k.cotizSinSeguimiento,
      }
    })
}

/** Serie mensual desde filas crudas. Para el detalle de un mes. */
export function serieMensual(
  rows: VentaRow[],
  dimension: Dimension | null,
): PuntoSerie[] {
  const porMes = new Map<string, VentaRow[]>()
  for (const r of excluirInterno(rows)) {
    const mes = aMes(r.fecha_cotizacion)
    const acc = porMes.get(mes)
    if (acc) acc.push(r)
    else porMes.set(mes, [r])
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([anioMes, filas]) => {
      const k = calcularKpis(filas, dimension)!
      return {
        anioMes,
        impCotizado: k.impCotizado,
        impFacturado: k.impFacturado,
        convRenglonesPct: k.convRenglonesPct,
        convImportePct: k.convImportePct,
        cotizaciones: k.cotizaciones,
        cotizSinSeguimiento: k.cotizSinSeguimiento,
      }
    })
}

// ------------------------------------------------------------------
// Rankings
// ------------------------------------------------------------------

export interface FilaRanking {
  dimensionId: string
  codigo: string
  nombre: string
  canal: Canal
  impFacturado: number
  impCotizado: number
  impEnProceso: number
  impSinSeguimiento: number
  impSuspendido: number
  impCancelado: number
  convRenglonesPct: number
  convImportePct: number
  cotizaciones: number | null
  cotizSinSeguimiento: number | null
  sinSeguimientoPct: number | null
  impRenglonMax: number
  artRenglonMax: string
  renglonMaxConvertido: number
  ultimaActividad: string
  ultimaFactura: string | null
}

export type OrdenRanking = 'impFacturado' | 'impCotizado' | 'sinSeguimientoPct'

/**
 * REGLA — los rankings se ordenan por importe FACTURADO, no cotizado.
 *
 * El ganador cambia segun cual se use. Por cotizado gana quien cotiza
 * mucho y cierra poco; por facturado gana quien vende. Ordenar por
 * cotizado premia el comportamiento equivocado, y alguien va a reclamar
 * un bono.
 *
 * `impCotizado` sigue disponible como orden explicito porque es util
 * para encontrar justo ese patron, pero nunca es el default.
 */
export const ORDEN_RANKING_DEFAULT: OrdenRanking = 'impFacturado'

/**
 * Ranking desde las filas de v_ventas_ranking.
 *
 * La vista trae grano (entidad x canal), asi que aqui se colapsa el
 * canal: cada entidad queda con una fila y se etiqueta con el canal
 * donde mas facturo.
 */
export function construirRankingDesdeVista(
  filas: FilaRankingVista[],
  dimension: Dimension,
  orden: OrdenRanking = ORDEN_RANKING_DEFAULT,
): FilaRanking[] {
  const porEntidad = new Map<string, FilaRankingVista[]>()
  for (const r of excluirInterno(filas)) {
    if (r.dimension !== dimension) continue
    const acc = porEntidad.get(r.dimension_id)
    if (acc) acc.push(r)
    else porEntidad.set(r.dimension_id, [r])
  }

  const salida: FilaRanking[] = []
  for (const [dimensionId, grupo] of Array.from(porEntidad)) {
    const k = calcularKpis(grupo, dimension)
    if (!k) continue
    const dominante = grupo.reduce((a, b) =>
      b.imp_facturado > a.imp_facturado ? b : a,
    )
    const ultimo = grupo.reduce((a, b) =>
      b.ultima_actividad > a.ultima_actividad ? b : a,
    )
    const ultimaFac = grupo.reduce((a, b) => {
      if (!a.ultima_factura) return b
      if (!b.ultima_factura) return a
      return b.ultima_factura > a.ultima_factura ? b : a
    })

    salida.push({
      dimensionId,
      codigo: dominante.dimension_codigo,
      nombre: dominante.dimension_nombre,
      canal: dominante.canal,
      impFacturado: k.impFacturado,
      impCotizado: k.impCotizado,
      impEnProceso: k.impEnProceso,
      impSinSeguimiento: k.impSinSeguimiento,
      impSuspendido: k.impSuspendido,
      impCancelado: k.impCancelado,
      convRenglonesPct: k.convRenglonesPct,
      convImportePct: k.convImportePct,
      cotizaciones: k.cotizaciones,
      cotizSinSeguimiento: k.cotizSinSeguimiento,
      sinSeguimientoPct: k.sinSeguimientoPct,
      impRenglonMax: k.impRenglonMax,
      artRenglonMax: k.artRenglonMax,
      renglonMaxConvertido: k.renglonMaxConvertido,
      ultimaActividad: ultimo.ultima_actividad,
      ultimaFactura: ultimaFac.ultima_factura || null,
    })
  }

  return salida.sort((a, b) => (b[orden] ?? 0) - (a[orden] ?? 0))
}

/** Ranking desde filas crudas. Para el detalle de un mes. */
export function construirRanking(
  rows: VentaRow[],
  dimension: Dimension,
  orden: OrdenRanking = ORDEN_RANKING_DEFAULT,
): FilaRanking[] {
  const porEntidad = new Map<string, VentaRow[]>()
  for (const r of excluirInterno(rows)) {
    if (r.dimension !== dimension) continue
    const acc = porEntidad.get(r.dimension_id)
    if (acc) acc.push(r)
    else porEntidad.set(r.dimension_id, [r])
  }

  const filas: FilaRanking[] = []
  for (const [dimensionId, grupo] of Array.from(porEntidad)) {
    const k = calcularKpis(grupo, dimension)
    if (!k) continue
    // La entidad puede tener filas en varios canales; se etiqueta con
    // el canal donde mas facturo.
    const canal = grupo.reduce((a, b) =>
      b.imp_facturado > a.imp_facturado ? b : a,
    ).canal
    const ultimo = grupo.reduce((a, b) =>
      b.fecha_cotizacion > a.fecha_cotizacion ? b : a,
    )
    const ultimaFac = grupo.reduce((a, b) => {
      if (!a.ultima_factura) return b
      if (!b.ultima_factura) return a
      return b.ultima_factura > a.ultima_factura ? b : a
    })

    filas.push({
      dimensionId,
      codigo: ultimo.dimension_codigo,
      nombre: ultimo.dimension_nombre,
      canal,
      impFacturado: k.impFacturado,
      impCotizado: k.impCotizado,
      impEnProceso: k.impEnProceso,
      impSinSeguimiento: k.impSinSeguimiento,
      impSuspendido: k.impSuspendido,
      impCancelado: k.impCancelado,
      convRenglonesPct: k.convRenglonesPct,
      convImportePct: k.convImportePct,
      cotizaciones: k.cotizaciones,
      cotizSinSeguimiento: k.cotizSinSeguimiento,
      sinSeguimientoPct: k.sinSeguimientoPct,
      impRenglonMax: k.impRenglonMax,
      artRenglonMax: k.artRenglonMax,
      renglonMaxConvertido: k.renglonMaxConvertido,
      ultimaActividad: ultimo.fecha_cotizacion,
      ultimaFactura: ultimaFac.ultima_factura || null,
    })
  }

  return filas.sort((a, b) => (b[orden] ?? 0) - (a[orden] ?? 0))
}

/**
 * Regla 10: "ultima compra" es dato del periodo completo, no del mes filtrado.
 *
 * `construirRanking` trabaja sobre el detalle del mes seleccionado, asi que su
 * `ultimaFactura` solo ve ese mes y devuelve null para quien no facturo ahi.
 * Esta funcion repone el dato con la vista de periodo completo.
 *
 * El filtro por dimension NO es opcional. `v_ventas_ranking` se trae con
 * `dimension IN ('cliente','vendedor')` en una sola llamada, y los
 * `dimension_id` de una dimension pueden colisionar con los de la otra. Sin
 * filtrar, la tabla de clientes muestra la ultima factura de un vendedor:
 * un dato que se ve correcto y no lo es.
 *
 * Si no hay filas de esa dimension (caso 'producto', que llega por otra
 * consulta), devuelve el ranking tal cual y no inventa nada.
 */
export function enriquecerConUltimaFactura(
  ranking: FilaRanking[],
  filasVista: FilaRankingVista[] | null | undefined,
  dimension: Dimension,
): FilaRanking[] {
  if (!filasVista || filasVista.length === 0) return ranking

  const ultimaPorEntidad = new Map<string, string | null>()

  for (const fila of filasVista) {
    if (fila.dimension !== dimension) continue

    const previa = ultimaPorEntidad.get(fila.dimension_id)
    const candidata = fila.ultima_factura ?? null

    // Una entidad tiene una fila por canal. Nos quedamos con la mas reciente.
    if (candidata !== null && (previa == null || candidata > previa)) {
      ultimaPorEntidad.set(fila.dimension_id, candidata)
    } else if (!ultimaPorEntidad.has(fila.dimension_id)) {
      ultimaPorEntidad.set(fila.dimension_id, previa ?? null)
    }
  }

  if (ultimaPorEntidad.size === 0) return ranking

  return ranking.map((f) => ({
    ...f,
    ultimaFactura: ultimaPorEntidad.get(f.dimensionId) ?? f.ultimaFactura ?? null,
  }))
}

// ------------------------------------------------------------------
// Formato
// ------------------------------------------------------------------

/** Pesos sin decimales. Los importes de ventas son de ocho cifras. */
export function formatMoneda(n: number | null | undefined): string {
  if (n == null) return '$0'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Compacto para ejes de grafica: $2.7 MM, $459.7 M. */
export function formatMonedaCorta(n: number | null | undefined): string {
  if (n == null) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${formatDecimal(n / 1e9)} MM`
  if (abs >= 1e6) return `$${formatDecimal(n / 1e6)} M`
  if (abs >= 1e3) return `$${formatDecimal(n / 1e3)} k`
  return formatMoneda(n)
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${formatDecimal(n)}%`
}

export function formatEntero(n: number | null | undefined): string {
  if (n == null) return '—'
  return formatNumber(n)
}

/**
 * REGLA — 'sin seguimiento' jamas se etiqueta como venta perdida.
 *
 * Es el status F: el ERP suspende sola la cotizacion a los 10 dias sin
 * que nadie la toque, para que no arrastre precios viejos. Al revivirla
 * toma precios nuevos. No es que el cliente dijera que no: es que nadie
 * volvio a hablarle. Es la metrica mas accionable del modulo y llamarla
 * "perdida" la vuelve inutil.
 *
 * Status R (suspension manual) es otra cosa y va en su propia columna.
 */
export const ETIQUETA_SIN_SEGUIMIENTO = 'Sin seguimiento'
export const ETIQUETA_SUSPENDIDA = 'Suspendida a mano'
