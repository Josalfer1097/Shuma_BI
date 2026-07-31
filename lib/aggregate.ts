import { ReporteRow, DashboardMetrics } from './types'

export function aggregate(rows: ReporteRow[]): DashboardMetrics | null {
  if (rows.length === 0) return null

  const total = rows.reduce((s, r) => s + r.total, 0)
  if (total === 0) return null

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
    facturas_fuera_de_rango: rows.reduce((s, r) => s + r.facturas_fuera_de_rango, 0),
  }
}
