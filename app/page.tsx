import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { AreaCard } from '@/components/AreaCard'
import { PanelLogistica } from '@/components/PanelLogistica'
import { resumenLogistica } from '@/lib/aggregate'
import { AREAS_PENDIENTES } from '@/lib/areas'
import type { ReporteRow, EtlStatus } from '@/lib/types'

export const revalidate = 0

export default async function Portada() {
  // Misma consulta que ya usaba el tablero. No se agregan tablas ni
  // consultas nuevas: la portada deriva sus cifras de estos datos.
  const [reporteRes, etlRes] = await Promise.all([
    supabase.from('reporte_tiempos_zona_mes').select('*'),
    supabase.from('etl_status').select('*').eq('id', 1).single(),
  ])

  // Un fallo de datos degrada solo el panel de logistica. La portada nunca
  // se queda en blanco: las demas areas no dependen de esta consulta.
  const filas = (reporteRes.error ? null : (reporteRes.data as ReporteRow[])) ?? []
  const resumen = filas.length > 0 ? resumenLogistica(filas) : null
  const etlStatus = (etlRes.error ? null : (etlRes.data as EtlStatus)) ?? null

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Header
        etlStatus={etlStatus}
        titulo="Tablero Operativo"
        subtitulo="Indicadores por área — Grupo Shuma"
      />

      <PanelLogistica resumen={resumen} />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-scale-lg font-semibold text-text-primary">Otras áreas</h2>
          <span className="text-scale-xs text-text-muted">
            {AREAS_PENDIENTES.length} pendientes de integrar
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {AREAS_PENDIENTES.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>

        <p className="mt-6 text-scale-sm text-text-muted">
          Cada área se integra cuando sus indicadores están definidos con el responsable
          correspondiente. Las tarjetas sin cifras todavía no tienen datos conectados.
        </p>
      </section>
    </main>
  )
}
