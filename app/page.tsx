import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { EmpresaCard } from '@/components/EmpresaCard'
import { resumenLogistica } from '@/lib/aggregate'
import { EMPRESAS } from '@/lib/empresas'
import type { ReporteRow } from '@/lib/types'

export const revalidate = 0

/**
 * Pagina de inicio: elegir empresa.
 *
 * Tiene una sola funcion y por eso muestra un solo indicador por empresa. El
 * detalle por area vive un nivel adentro, en /[empresa]. Mezclar las dos
 * empresas y las cinco areas en esta pantalla dejaba todo compitiendo por
 * atencion sin que nada tuviera prioridad.
 */
export default async function Portada() {
  // Una sola consulta para todas las empresas; el reparto se hace en memoria.
  // No se consulta etl_status: el estado de la actualizacion pertenece al
  // detalle de cada empresa, no a la pantalla de eleccion.
  const reporteRes = await supabase.from('reporte_tiempos_zona_mes').select('*')
  const filasTotales = reporteRes.error ? [] : (reporteRes.data as ReporteRow[])

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <Header titulo="Tablero Operativo" subtitulo="Grupo Shuma" />

      <p className="mb-8 text-scale-base text-text-secondary">
        Elige una empresa para ver sus indicadores de operación.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {EMPRESAS.map((empresa) => {
          const filas = filasTotales.filter((f) => f.empresa === empresa.id)
          const resumen = filas.length > 0 ? resumenLogistica(filas, empresa.metaDias) : null
          return <EmpresaCard key={empresa.id} empresa={empresa} resumen={resumen} />
        })}
      </div>

      <p className="mt-8 text-scale-sm text-text-muted">
        El tiempo típico es la mediana ponderada por volumen, no el promedio. Cada empresa tiene su
        propia meta comprometida, por lo que sus cifras no se suman ni se comparan entre sí.
      </p>
    </main>
  )
}
