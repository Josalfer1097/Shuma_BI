import { ReporteRow, DashboardMetrics } from './types'
import { META_DIAS } from './config'

export function aggregate(rows: ReporteRow[]): DashboardMetrics | null {
  if (rows.length === 0) return null

  const total = rows.reduce((s, r) => s + r.total, 0)
  if (total === 0) return null
  
  let zonas_mes_cumplen_meta = 0
  let entregas_cumplen_meta = 0
  for (const row of rows) {
    if (row.mediana_dias <= META_DIAS) {
      zonas_mes_cumplen_meta++
      entregas_cumplen_meta += row.total
    }
  }

  return {
    total,
    // Ponderadas por volumen -- una zona con 40k entregas pesa mas
    // que una con 2. Promediar sin ponderar da numeros incorrectos.
    // Nota de negocio: La mediana ponderada de medianas es una aproximacion,
    // no una mediana real recalculada. Es lo correcto con datos agregados.
    promedio_dias: rows.reduce((s, r) => s + r.promedio_dias * r.total, 0) / total,
    mediana_dias: rows.reduce((s, r) => s + r.mediana_dias * r.total, 0) / total,

    // MAXIMO es el mayor de todos, NO un promedio ponderado.
    maximo_dias: Math.max(...rows.map(r => r.maximo_dias)),

    // Conteos: suma simple.
    total_con_factura: rows.reduce((s, r) => s + r.total_con_factura, 0),
    con_autoriz_lista: rows.reduce((s, r) => s + r.con_autoriz_lista, 0),
    con_autoriz_cxc: rows.reduce((s, r) => s + r.con_autoriz_cxc, 0),
    con_autoriz_descuentos: rows.reduce((s, r) => s + r.con_autoriz_descuentos, 0),

    // Tramos del ciclo: medianas ponderadas por volumen
    med_cot_autorizacion: rows.reduce((s, r) => s + (r.med_cot_autorizacion ?? 0) * r.total, 0) / total,
    med_autorizacion_recepcion: rows.reduce((s, r) => s + (r.med_autorizacion_recepcion ?? 0) * r.total, 0) / total,
    med_recepcion_surtido: rows.reduce((s, r) => s + (r.med_recepcion_surtido ?? 0) * r.total, 0) / total,
    med_surtido_ruta: rows.reduce((s, r) => s + (r.med_surtido_ruta ?? 0) * r.total, 0) / total,
    med_ruta_entrega: rows.reduce((s, r) => s + (r.med_ruta_entrega ?? 0) * r.total, 0) / total,
    med_entrega_validacion: rows.reduce((s, r) => s + (r.med_entrega_validacion ?? 0) * r.total, 0) / total,
    // med_entrega_factura NO se agrega ponderado: unos pocos registros con
    // valores negativos extremos (-14 dias) distorsionan el resultado y lo
    // vuelven negativo. La mediana de las medianas es robusta a esos casos.
    med_entrega_factura: (() => {
      const valores = rows
        .map(r => r.med_entrega_factura)
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      return valores.length
        ? valores[Math.floor(valores.length / 2)]
        : null;
    })(),
    
    total_zonas_mes_evaluadas: rows.length,
    zonas_mes_cumplen_meta,
    entregas_cumplen_meta
  }
}

/**
 * Resumen de logistica para la portada.
 *
 * Se apoya en aggregate() en lugar de recalcular: si algun dia cambia el
 * criterio de ponderacion, cambia en un solo lugar y la portada lo hereda.
 *
 * Devuelve null cuando no hay filas, para que la portada muestre el aviso
 * de sin datos en vez de ceros que parecen reales.
 */
export interface ResumenLogistica {
  medianaDias: number
  cumpleMeta: boolean
  mesesEnMeta: number
  mesesTotales: number
  etapaMasLentaNombre: string
  etapaMasLentaPorcentaje: number
  zonasFueraDeMeta: number
  zonasTotales: number
  entregas: number
}

const ETAPAS_CICLO: { clave: keyof DashboardMetrics; nombre: string }[] = [
  { clave: 'med_cot_autorizacion', nombre: 'Autorización' },
  { clave: 'med_autorizacion_recepcion', nombre: 'Recepción' },
  { clave: 'med_recepcion_surtido', nombre: 'Surtido' },
  { clave: 'med_surtido_ruta', nombre: 'Surtido a ruta' },
  { clave: 'med_ruta_entrega', nombre: 'Ruta a entrega' },
  { clave: 'med_entrega_validacion', nombre: 'Validación' },
]

export function resumenLogistica(rows: ReporteRow[]): ResumenLogistica | null {
  const m = aggregate(rows)
  if (!m) return null

  // Meses dentro de meta: se evalua la mediana ponderada de cada mes
  // completo, no cada combinacion de zona y mes por separado.
  const porMes = new Map<string, ReporteRow[]>()
  for (const row of rows) {
    const acumulado = porMes.get(row.anio_mes)
    if (acumulado) acumulado.push(row)
    else porMes.set(row.anio_mes, [row])
  }

  let mesesEnMeta = 0
  porMes.forEach((filas) => {
    const resumen = aggregate(filas)
    if (resumen && resumen.mediana_dias <= META_DIAS) mesesEnMeta++
  })

  // Zonas fuera de meta: misma logica, agrupando por zona.
  const porZona = new Map<string, ReporteRow[]>()
  for (const row of rows) {
    const acumulado = porZona.get(row.zona)
    if (acumulado) acumulado.push(row)
    else porZona.set(row.zona, [row])
  }

  let zonasFueraDeMeta = 0
  porZona.forEach((filas) => {
    const resumen = aggregate(filas)
    if (resumen && resumen.mediana_dias > META_DIAS) zonasFueraDeMeta++
  })

  // Etapa mas lenta como porcentaje del ciclo. El denominador es la suma de
  // las etapas y no la mediana global: las etapas se miden por separado y su
  // suma no coincide exactamente con el ciclo completo.
  const etapas = ETAPAS_CICLO.map((e) => ({
    nombre: e.nombre,
    valor: (m[e.clave] as number | null) ?? 0,
  }))
  const sumaEtapas = etapas.reduce((s, e) => s + e.valor, 0)
  const masLenta = etapas.reduce((a, b) => (b.valor > a.valor ? b : a), etapas[0])

  return {
    medianaDias: m.mediana_dias,
    cumpleMeta: m.mediana_dias <= META_DIAS,
    mesesEnMeta,
    mesesTotales: porMes.size,
    etapaMasLentaNombre: masLenta.nombre,
    etapaMasLentaPorcentaje: sumaEtapas > 0 ? (masLenta.valor / sumaEtapas) * 100 : 0,
    zonasFueraDeMeta,
    zonasTotales: porZona.size,
    entregas: m.total,
  }
}
