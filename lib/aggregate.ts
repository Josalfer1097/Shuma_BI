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
