import {
  FilaMensual,
  FilaRankingVista,
  Dimension,
  Canal,
  calcularKpis,
  excluirInterno,
  excluirMostradorDeCliente,
  construirRankingDesdeVista,
  formatMoneda,
  formatMonedaCorta,
  formatPct,
  formatEntero,
  esVendedor,
  ETIQUETA_SIN_SEGUIMIENTO,
} from './ventas'

/**
 * Hallazgos del modulo de Ventas.
 *
 * Mismo criterio que lib/hallazgos.ts de logistica: todo lo que sale de
 * aqui es un hecho calculado sobre las filas que el tablero ya tiene en
 * memoria, auditable contra la tabla de Supabase. Nada esta escrito a
 * mano, asi que nada se queda viejo.
 *
 * DELIBERADAMENTE no hay recomendaciones. El tablero no sabe que paso
 * ese mes ni por que. Senala que cambio y que esta fuera de lo normal;
 * quien lo presenta explica la causa.
 */

export type TipoHallazgo = 'cambio' | 'atipico' | 'dato'
export type Tono = 'bueno' | 'malo' | 'neutro'

/**
 * A donde lleva un hallazgo cuando se pulsa.
 *
 * Un hallazgo sin salida obliga a reconstruir el filtro a mano: leer
 * "ISIS concentra el 44.1% del abandono", cerrar el panel, cambiar la
 * dimension, buscarla en el selector y reordenar. Cuatro pasos, y para
 * entonces la cifra ya se olvido.
 *
 * params se aplica sobre los que ya estan en la URL: null borra el
 * parametro, una cadena lo fija. Lo que no se menciona se respeta.
 */
export interface AccionHallazgo {
  etiqueta: string
  params: Record<string, string | null>
}

export interface Hallazgo {
  tipo: TipoHallazgo
  tono: Tono
  titulo: string
  detalle: string
  /**
   * Opcional a proposito. Hay hallazgos que no tienen a donde llevar:
   * "sin seguimiento va de 1.1% a 45.4%" es un rango entre personas, no
   * un lugar. Si todas las tarjetas fueran boton, ninguna destacaria.
   */
  accion?: AccionHallazgo
}

function mesAnterior(anioMes: string): string {
  const [a, m] = anioMes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function nombreMes(anioMes: string): string {
  const [a, m] = anioMes.split('-').map(Number)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${meses[m - 1]} ${a}`
}

/**
 * La brecha entre las dos conversiones.
 *
 * En CFS los productos convierten cerca del 67% pero solo el 26% del
 * dinero. No es contradiccion: el producto que se factura promedia mucho
 * menos que el que no. Lo grande no cierra, y ese es el hallazgo, no el
 * porcentaje.
 */
function hallazgoBrechaConversion(rows: FilaMensual[]): Hallazgo | null {
  const k = calcularKpis(rows, 'cliente')
  if (!k || k.renglones === 0) return null

  const convertidos = rows.reduce((s, r) => s + r.reng_facturados, 0)
  const noConvertidos = k.renglones - convertidos
  if (convertidos === 0 || noConvertidos === 0) return null

  const impConvertido = rows.reduce((s, r) => s + r.imp_cot_convertido, 0)
  const ticketSi = impConvertido / convertidos
  const ticketNo = (k.impCotizado - impConvertido) / noConvertidos
  if (ticketNo <= ticketSi) return null

  const veces = ticketNo / ticketSi

  return {
    tipo: 'dato',
    tono: 'neutro',
    titulo: 'Lo grande no cierra',
    detalle:
      `${formatPct(k.convRenglonesPct)} de los productos se facturan, pero ` +
      `solo ${formatPct(k.convImportePct)} del importe. El producto que sí se ` +
      `factura promedia ${formatMoneda(ticketSi)}; el que no, ` +
      `${formatMoneda(ticketNo)}. Son ${veces.toFixed(1)} veces más grande.`,
    accion: {
      etiqueta: 'Ver productos',
      params: { dimension: 'producto', entidad: null },
    },
  }
}

/** Variacion del facturado contra el mes anterior. */
function hallazgoCambioMensual(
  rows: FilaMensual[],
  mes: string,
): Hallazgo | null {
  const previo = mesAnterior(mes)
  const deMes = (m: string) => rows.filter((r) => r.anio_mes === m)

  const a = calcularKpis(deMes(mes), 'cliente')
  const b = calcularKpis(deMes(previo), 'cliente')
  if (!a || !b || b.impFacturado === 0) return null

  const delta = ((a.impFacturado - b.impFacturado) / b.impFacturado) * 100
  if (Math.abs(delta) < 10) return null

  return {
    tipo: 'cambio',
    tono: delta > 0 ? 'bueno' : 'malo',
    titulo: `Facturación ${delta > 0 ? 'arriba' : 'abajo'} ${formatPct(Math.abs(delta))} contra ${nombreMes(previo)}`,
    detalle:
      `${formatMonedaCorta(b.impFacturado)} en ${nombreMes(previo)} contra ` +
      `${formatMonedaCorta(a.impFacturado)} en ${nombreMes(mes)}.`,
  }
}

/**
 * El rango de "sin seguimiento" entre vendedores.
 *
 * Es la metrica mas accionable del modulo: no mide venta perdida, mide
 * cotizaciones que nadie volvio a tocar en 10 dias.
 */
function hallazgoSinSeguimiento(ranking0: FilaRankingVista[]): Hallazgo | null {
  const ranking = construirRankingDesdeVista(ranking0, 'vendedor')
    .filter((f) => esVendedor(f) && (f.cotizaciones ?? 0) >= 100 && f.sinSeguimientoPct !== null)
  if (ranking.length < 3) return null

  const orden = [...ranking].sort(
    (a, b) => (b.sinSeguimientoPct ?? 0) - (a.sinSeguimientoPct ?? 0),
  )
  const peor = orden[0]
  const mejor = orden[orden.length - 1]
  if ((peor.sinSeguimientoPct ?? 0) - (mejor.sinSeguimientoPct ?? 0) < 10) return null

  return {
    tipo: 'atipico',
    tono: 'malo',
    titulo: `${ETIQUETA_SIN_SEGUIMIENTO} va de ${formatPct(mejor.sinSeguimientoPct)} a ${formatPct(peor.sinSeguimientoPct)}`,
    detalle:
      `${peor.nombre} deja sin seguimiento ${formatPct(peor.sinSeguimientoPct)} de sus ` +
      `${formatEntero(peor.cotizaciones)} cotizaciones. ${mejor.nombre}, ` +
      `${formatPct(mejor.sinSeguimientoPct)} de ${formatEntero(mejor.cotizaciones)}. ` +
      `No es una cifra del área: es el rango entre personas.`,
    accion: {
      etiqueta: 'Ver vendedores',
      params: { dimension: 'vendedor', entidad: null },
    },
  }
}

/**
 * Concentración del abandono en vendedores específicos.
 */
function hallazgoAbandonado(ranking0: FilaRankingVista[]): Hallazgo | null {
  const rankingExterno = ranking0.filter((r) => r.canal === 'externo')
  const ranking = construirRankingDesdeVista(rankingExterno, 'vendedor')
    .filter(esVendedor)
  if (ranking.length < 2) return null

  const orden = [...ranking].sort(
    (a, b) => (b.impSinSeguimiento ?? 0) - (a.impSinSeguimiento ?? 0)
  )
  const total = orden.reduce((s, f) => s + (f.impSinSeguimiento ?? 0), 0)
  if (total === 0) return null

  const v1 = orden[0]
  const v2 = orden[1]
  const p1 = (v1.impSinSeguimiento ?? 0) / total
  const p2 = (v2.impSinSeguimiento ?? 0) / total

  if (p1 > 0.4) {
    return {
      tipo: 'atipico',
      tono: 'malo',
      titulo: `${v1.nombre} concentra el ${formatPct(p1 * 100)} del abandono`,
      detalle: `De los ${formatMonedaCorta(total)} sin seguimiento en el canal externo, ${formatMonedaCorta(v1.impSinSeguimiento ?? 0)} son de un solo vendedor.`,
      accion: {
        etiqueta: 'Ver a esta persona',
        params: { dimension: 'vendedor', entidad: v1.dimensionId, canal: 'externo' },
      },
    }
  } else if (p1 + p2 > 0.4) {
    return {
      tipo: 'atipico',
      tono: 'malo',
      titulo: `Dos vendedores concentran el ${formatPct((p1 + p2) * 100)} del abandono`,
      detalle: `${v1.nombre} (${formatMonedaCorta(v1.impSinSeguimiento ?? 0)}) y ${v2.nombre} (${formatMonedaCorta(v2.impSinSeguimiento ?? 0)}) suman la mayor parte de los ${formatMonedaCorta(total)} sin seguimiento.`,
      accion: {
        etiqueta: 'Ver vendedores',
        params: { dimension: 'vendedor', entidad: null, canal: 'externo' },
      },
    }
  }

  return null
}

/**
 * Clientes grandes dormidos.
 * 
 * Si hay perdidos (> 180 días), muestra el total y el mayor.
 * Si no hay perdidos pero hay en riesgo (90-180), muestra el total y el mayor.
 */
function hallazgoDormidos(ranking: FilaRankingVista[]): Hallazgo | null {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0)
  
  const candidatos = ranking.filter(r => 
    r.dimension === 'cliente' &&
    r.canal === 'externo' &&
    r.imp_facturado >= 500000 &&
    r.ultima_factura
  )

  let perdidos = 0
  let mayorPerdido: FilaRankingVista | null = null
  let riesgo = 0
  let mayorRiesgo: FilaRankingVista | null = null

  for (const r of candidatos) {
    const fechaFac = new Date(r.ultima_factura as string)
    fechaFac.setHours(0, 0, 0, 0)
    
    const diffTime = ahora.getTime() - fechaFac.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 180) {
      perdidos++
      if (!mayorPerdido || r.imp_facturado > mayorPerdido.imp_facturado) mayorPerdido = r
    } else if (diffDays >= 90) {
      riesgo++
      if (!mayorRiesgo || r.imp_facturado > mayorRiesgo.imp_facturado) mayorRiesgo = r
    }
  }

  if (perdidos > 0 && mayorPerdido) {
    return {
      tipo: 'atipico',
      tono: 'malo',
      titulo: `${perdidos} cliente${perdidos > 1 ? 's' : ''} grande${perdidos > 1 ? 's' : ''} sin comprar`,
      detalle: `Llevan más de 180 días sin facturar. El mayor es ${mayorPerdido.dimension_nombre} (${formatMonedaCorta(mayorPerdido.imp_facturado)} facturados históricamente). Antes de tratarlo como venta perdida, revisa en el SGE si tiene el crédito suspendido: hay casos en esta lista que dejaron de comprar por cobranza, no por falta de interés.`,
      accion: {
        etiqueta: 'Ver clientes',
        // anio y mes en Todos: un cliente dormido se mide contra la
        // historia. Con un mes suelto, todo el que no compro ese mes
        // saldria dormido y el hallazgo dejaria de significar algo.
        params: { dimension: 'cliente', entidad: null, anio: 'Todos', mes: 'Todos' },
      },
    }
  }

  if (riesgo > 0 && mayorRiesgo) {
    return {
      tipo: 'atipico',
      tono: 'malo',
      titulo: `${riesgo} cliente${riesgo > 1 ? 's' : ''} grande${riesgo > 1 ? 's' : ''} en riesgo`,
      detalle: `Llevan entre 90 y 180 días sin facturar. El mayor es ${mayorRiesgo.dimension_nombre} (${formatMonedaCorta(mayorRiesgo.imp_facturado)} facturados históricamente). Revisa en el SGE si el crédito está suspendido antes de asumir que se fueron.`,
      accion: {
        etiqueta: 'Ver clientes',
        params: { dimension: 'cliente', entidad: null, anio: 'Todos', mes: 'Todos' },
      }
    }
  }

  return null
}

/**
 * El producto mas grande del periodo.
 *
 * Es un hecho, no una regla. Deja ver de un vistazo si un solo dedazo
 * inflo el periodo: ya se detecto uno de 700,251 piezas de una
 * reduccion de tuberia.
 */
function hallazgoRenglonAtipico(ranking: FilaRankingVista[]): Hallazgo | null {
  const filas = excluirInterno(ranking)
  const productos = filas.filter((r) => r.dimension === 'producto')
  if (productos.length === 0) return null

  const mayor = productos.reduce((a, b) =>
    b.imp_reng_max > a.imp_reng_max ? b : a,
  )

  // El denominador sale de la dimension cliente, no de producto.
  //
  // Las tres dimensiones suman identico, asi que da lo mismo cual se
  // use para el total. Pero producto son ~12,000 filas contra 756 de
  // cliente: pedirlas todas solo para sumar el mismo numero cuesta
  // doce peticiones y bloquea el render. Asi basta con traer los
  // pocos productos de mayor partida.
  const total = filas
    .filter((r) => r.dimension === 'cliente')
    .reduce((s, r) => s + r.imp_cotizado, 0)
  if (total === 0 || mayor.imp_reng_max === 0) return null

  const peso = (mayor.imp_reng_max / total) * 100
  if (peso < 1) return null

  return {
    tipo: 'atipico',
    tono: 'neutro',
    titulo: `Un solo producto vale ${formatPct(peso)} del periodo`,
    detalle:
      `${mayor.dimension_nombre} (${mayor.dimension_codigo}) por ` +
      `${formatMoneda(mayor.imp_reng_max)} en ${formatEntero(mayor.cant_reng_max)} ` +
      `unidades. Verificar antes de leer la tendencia.`,
    accion: {
      etiqueta: 'Ver este producto',
      params: { dimension: 'producto', entidad: mayor.dimension_id },
    },
  }
}

/** Peso de los canales que no son venta a cliente registrado. */
function hallazgoCanales(rows: FilaMensual[]): Hallazgo | null {
  const dimension: Dimension = 'cliente'
  const filas = excluirInterno(rows)
  const total = filas.reduce((s, r) => s + r.imp_cotizado, 0)
  if (total === 0) return null

  const mostrador = filas
    .filter((r) => r.canal === 'mostrador')
    .reduce((s, r) => s + r.imp_cotizado, 0)
  const inter = filas
    .filter((r) => r.canal === 'intercompania')
    .reduce((s, r) => s + r.imp_cotizado, 0)
  if (mostrador === 0 && inter === 0) return null

  const kInter = calcularKpis(
    filas.filter((r) => r.canal === 'intercompania'),
    dimension,
  )

  return {
    tipo: 'dato',
    tono: 'neutro',
    titulo: 'Qué parte del cotizado no es venta a cliente registrado',
    detalle:
      `Mostrador: ${formatPct((mostrador / total) * 100)} del importe cotizado. ` +
      `Intercompañía: ${formatPct((inter / total) * 100)}` +
      (kInter
        ? `, y convierte al ${formatPct(kInter.convImportePct)} porque la venta ` +
        `entre empresas del grupo casi siempre se factura. Por eso no suma al consolidado.`
        : '.'),
    accion: {
      etiqueta: 'Ver mostrador',
      params: { canal: 'mostrador', dimension: 'cliente', entidad: null },
    },
  }
}

/** Concentracion de la facturacion en los cinco clientes mayores. */
function hallazgoConcentracion(
  ranking0: FilaRankingVista[],
  canal: Canal | null,
): Hallazgo | null {
  // Misma regla que la tabla: una cuenta de mostrador no es un cliente
  // y no puede encabezar la concentracion.
  const { visibles } = excluirMostradorDeCliente(ranking0, 'cliente', canal)
  const ranking = construirRankingDesdeVista(visibles, 'cliente')
  if (ranking.length < 10) return null

  const total = ranking.reduce((s, f) => s + f.impFacturado, 0)
  if (total === 0) return null

  const top5 = ranking.slice(0, 5).reduce((s, f) => s + f.impFacturado, 0)
  const peso = (top5 / total) * 100
  if (peso < 20) return null

  return {
    tipo: 'dato',
    tono: peso > 50 ? 'malo' : 'neutro',
    titulo: `Los 5 clientes mayores son ${formatPct(peso)} de la facturación`,
    detalle:
      `Encabeza ${ranking[0].nombre} con ${formatMonedaCorta(ranking[0].impFacturado)} ` +
      `de ${formatEntero(ranking.length)} clientes con movimiento en el periodo.`,
    accion: {
      etiqueta: 'Ver ranking',
      params: { dimension: 'cliente', entidad: null },
    },
  }
}

/**
 * Arma los hallazgos del periodo visible.
 *
 * Se alimenta de las DOS vistas, no de la tabla cruda: v_ventas_mensual
 * para lo temporal y v_ventas_ranking para lo que es por entidad. Asi el
 * panel funciona con el mismo dato que ya trajo la pagina, sin bajar las
 * 106,517 filas de ventas_agregado.
 *
 * `ranking` debe venir COMPLETO. Esa vista pasa de 1,000 filas y
 * PostgREST la corta en silencio: si llega truncada, los hallazgos de
 * concentracion y de seguimiento salen mal sin que nada falle.
 */
export function construirHallazgos(
  mensual: FilaMensual[],
  ranking: FilaRankingVista[],
  mesActual: string | null,
  canal: Canal | null = null,
): Hallazgo[] {
  const lista: (Hallazgo | null)[] = [
    hallazgoDormidos(ranking),
    hallazgoAbandonado(ranking),
    mesActual ? hallazgoCambioMensual(mensual, mesActual) : null,
    hallazgoBrechaConversion(mensual),
    hallazgoSinSeguimiento(ranking),
    hallazgoConcentracion(ranking, canal),
    hallazgoCanales(mensual),
    hallazgoRenglonAtipico(ranking),
  ]

  return lista.filter((h): h is Hallazgo => h !== null)
}

// ------------------------------------------------------------------
// Glosario
// ------------------------------------------------------------------

export interface EntradaGlosario {
  termino: string
  definicion: string
}

/**
 * Lenguaje de negocio, sin jerga. Cada entrada existe porque el termino
 * se presta a una lectura equivocada, no porque suene tecnico.
 */
export const GLOSARIO_VENTAS: EntradaGlosario[] = [
  {
    termino: 'Producto cotizado',
    definicion:
      'Cada artículo que aparece en una cotización, con su cantidad y su ' +
      'precio. Una cotización con diez artículos distintos cuenta como ' +
      'diez productos.',
  },
  {
    termino: 'Producto facturado',
    definicion:
      'Producto cotizado que llegó a factura. Si se surtió en dos entregas ' +
      'sigue contando una sola vez, para que la comparación contra los ' +
      'cotizados tenga sentido.',
  },
  {
    termino: 'Conversión por productos',
    definicion:
      'De cada cien productos cotizados, cuántos terminaron facturados. ' +
      'Mide qué tan seguido se cierra.',
  },
  {
    termino: 'Conversión por importe',
    definicion:
      'De cada cien pesos cotizados, cuántos terminaron facturados. Mide ' +
      'cuánto dinero se cierra. Siempre es más baja que la de productos, ' +
      'porque las cotizaciones grandes cierran menos que las chicas.',
  },
  {
    termino: 'Sin seguimiento',
    definicion:
      'El sistema suspende sola una cotización si nadie la toca en diez ' +
      'días, para que no arrastre precios viejos. No significa que el ' +
      'cliente dijera que no: significa que nadie volvió a hablarle.',
  },
  {
    termino: 'Suspendida a mano',
    definicion:
      'Alguien decidió suspenderla. Es distinto de sin seguimiento y por ' +
      'eso va en su propia cuenta.',
  },
  {
    termino: 'Cliente Registrado',
    definicion:
      'Venta a un cliente dado de alta, con su vendedor y sus condiciones.',
  },
  {
    termino: 'Mostrador',
    definicion:
      'Venta de piso capturada en cuentas genéricas. Detrás hay miles de ' +
      'compradores distintos, que solo se identifican al momento de facturar.',
  },
  {
    termino: 'Intercompañía',
    definicion:
      'Venta entre empresas del grupo. Se muestra por empresa, pero nunca ' +
      'suma al consolidado: a nivel grupo ese dinero no es ingreso.',
  },
  {
    termino: 'Por qué producto va por mes',
    definicion:
      'Clientes y vendedores son unos cientos y se pueden ver día por día. ' +
      'Los artículos son casi siete mil, y a ese detalle el dato deja de ' +
      'decir algo. La serie diaria sale de clientes, que suma exactamente igual.',
  },
  {
    termino: 'Qué fecha usa este tablero',
    definicion:
      'Todo aquí se cuenta en la fecha de la COTIZACIÓN, no la de la ' +
      'factura. Una cotización de mayo que se facturó en junio aparece ' +
      'en mayo. Es lo correcto para medir qué tan bien se convierte lo ' +
      'que se cotiza: la venta se gana el día que se cotiza, no el día ' +
      'que se emite el papel.',
  },
  {
    termino: 'Por qué no cuadra contra el reporte de facturación',
    definicion:
      'El reporte de facturación del sistema cuenta en la fecha de la ' +
      'factura. Por eso los dos coinciden en el año pero difieren mes a ' +
      'mes, a veces hasta 25%: son las cotizaciones que se facturan el ' +
      'mes siguiente. Contra 2026 completo la diferencia entre ambos es ' +
      'menor al 1%. Ninguno de los dos está mal; responden preguntas ' +
      'distintas.',
  },
  {
    termino: 'Qué NO incluye el facturado',
    definicion:
      'Es el importe de la factura antes de descontar devoluciones, ' +
      'notas de crédito y anticipos aplicados. En el año esas ' +
      'deducciones pesan cerca del 9.6% de la facturación. La cifra ' +
      'neta vive en el reporte de facturación del sistema, no aquí.',
  },
  {
    termino: 'Clientes dormidos',
    definicion:
      'Clientes registrados que han facturado más de 500 mil pesos históricamente ' +
      'y llevan más de 90 días sin comprar. Si superan los 180 días, se consideran perdidos. ' +
      'No distingue entre quien se fue y quien tiene el crédito suspendido.',
  },
]
