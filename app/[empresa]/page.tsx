import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { crearClienteServidor } from '@/lib/supabase-server'
import { obtenerSesion, puedeVer } from '@/lib/auth'
import { Header } from '@/components/Header'
import { AreaCard } from '@/components/AreaCard'
import { PanelLogistica } from '@/components/PanelLogistica'
import { Tour } from '@/components/Tour'
import { getTourEmpresa, LLAVE_TOUR_EMPRESA } from '@/lib/tours'
import { resumenLogistica } from '@/lib/aggregate'
import { buscarEmpresa } from '@/lib/empresas'
import { AREAS_PENDIENTES } from '@/lib/areas'
import type { ReporteRow, EtlStatus } from '@/lib/types'

export const revalidate = 0
// Sin generateStaticParams a proposito: con el, Next prerenderiza la ruta y
// los datos quedarian congelados en el momento de compilar. Son dos empresas,
// no hay nada que ganar generandolas de antemano.

export async function generateMetadata({
  params,
}: {
  params: { empresa: string }
}): Promise<Metadata> {
  const empresa = buscarEmpresa(params.empresa)
  return {
    title: empresa ? `${empresa.nombreCorto} | Tablero Operativo Shuma` : 'Tablero Operativo Shuma',
  }
}

/**
 * Areas de una empresa.
 *
 * Nivel intermedio entre la eleccion de empresa y el modulo de detalle. Las
 * areas pendientes cuelgan de aqui y no de la portada porque son de cada
 * empresa: Acabados va a tener su propio credito y cobranza, distinto al de
 * Comercializadora.
 */
export default async function AreasDeEmpresa({ params }: { params: { empresa: string } }) {
  const empresa = buscarEmpresa(params.empresa)
  if (!empresa) notFound()

  const supabase = crearClienteServidor()
  const sesion = await obtenerSesion()

  // El middleware ya garantizo que hay sesion. Aqui se comprueba el permiso
  // concreto sobre esta empresa. Es la misma logica que aplica RLS en
  // Postgres; esto solo evita mostrar una pantalla vacia sin explicacion.
  if (!puedeVer(sesion, empresa.id, 'logistica')) redirect('/sin-acceso')

  const [reporteRes, etlRes] = await Promise.all([
    supabase.from('reporte_tiempos_zona_mes').select('*').eq('empresa', empresa.id),
    // maybeSingle y no single: una empresa sin corridas registradas devuelve
    // cero filas, y con single eso seria un error que tumbaria la pagina.
    supabase.from('etl_status').select('*').eq('empresa', empresa.id).maybeSingle(),
  ])

  const filas = reporteRes.error ? [] : ((reporteRes.data as ReporteRow[]) ?? [])
  const resumen = filas.length > 0 ? resumenLogistica(filas, empresa.metaDias) : null
  // El estado de la actualizacion es informacion secundaria: si falta, la
  // pagina se muestra igual.
  const etlStatus = etlRes.error ? null : ((etlRes.data as EtlStatus | null) ?? null)

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Header
        nombreSesion={sesion.perfil?.nombre ?? sesion.correo}
        etlStatus={etlStatus}
        titulo={empresa.nombreCorto}
        subtitulo={`${empresa.nombre} — Indicadores por área`}
        volverA="/"
        volverTexto="Empresas"
      />

      <PanelLogistica resumen={resumen} empresa={empresa} />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-scale-lg font-semibold text-text-primary">Otras áreas</h2>
          <span className="text-scale-xs text-text-muted">
            {AREAS_PENDIENTES.length} pendientes de integrar
          </span>
        </div>

        <div data-tour="areas-pendientes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {AREAS_PENDIENTES.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>

        <p className="mt-6 text-scale-sm text-text-muted">
          Cada área se integra cuando sus indicadores están definidos con el responsable
          correspondiente. Las tarjetas sin cifras todavía no tienen datos conectados.
        </p>
      </section>

      <Tour pasos={getTourEmpresa(empresa)} llaveStorage={`${LLAVE_TOUR_EMPRESA}-${empresa.id}`} />
    </main>
  )
}
