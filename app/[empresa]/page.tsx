import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { crearClienteServidor } from '@/lib/supabase-server'
import { obtenerSesion, puedeVer } from '@/lib/auth'
import { MarcoEmpresa } from '@/components/MarcoEmpresa'
import { Header } from '@/components/Header'
import { AreaCard } from '@/components/AreaCard'
import { PanelLogistica } from '@/components/PanelLogistica'
import { PanelVentas } from '@/components/PanelVentas'
import { Tour } from '@/components/Tour'
import { getTourEmpresa, LLAVE_TOUR_EMPRESA } from '@/lib/tours'
import { resumenLogistica } from '@/lib/aggregate'
import { buscarEmpresa } from '@/lib/empresas'
import { AREAS_PENDIENTES, AREAS_ACTIVAS_SIN_PANEL } from '@/lib/areas'
import { calcularKpis, soloVentaExterna } from '@/lib/ventas'
import type { FilaMensual } from '@/lib/ventas'
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
  if (!puedeVer(sesion, empresa.id, 'logistica') && !puedeVer(sesion, empresa.id, 'ventas')) {
     redirect('/sin-acceso')
  }

  const [reporteRes, etlRes, mensualVentasRes] = await Promise.all([
    supabase.from('reporte_tiempos_zona_mes').select('*').eq('empresa', empresa.id),
    supabase.from('etl_status').select('*').eq('empresa', empresa.id).maybeSingle(),
    supabase.from('v_ventas_mensual').select('*').eq('empresa', empresa.id),
  ])

  const filas = reporteRes.error ? [] : ((reporteRes.data as ReporteRow[]) ?? [])
  const resumen = filas.length > 0 ? resumenLogistica(filas, empresa.metaDias) : null
  const etlStatus = etlRes.error ? null : ((etlRes.data as EtlStatus | null) ?? null)

  // Datos de Ventas para el Panel
  const ventasRows = mensualVentasRes.error ? [] : ((mensualVentasRes.data as FilaMensual[]) ?? [])
  let ventasKpis = null
  let nombreMesVentas = ''
  
  let isUltimoMesVentas = false
  
  if (ventasRows.length > 0) {
    const ultimoMes = ventasRows.reduce((a, b) => b.anio_mes > a.anio_mes ? b : a).anio_mes
    const filasUltimoMes = soloVentaExterna(ventasRows.filter(r => r.anio_mes === ultimoMes))
    ventasKpis = calcularKpis(filasUltimoMes, 'cliente')
    
    // Obtener nombre del mes
    const [a, m] = ultimoMes.split('-').map(Number)
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    nombreMesVentas = `${meses[m - 1]} ${a}`

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    isUltimoMesVentas = ultimoMes === currentYearMonth
  }

  return (
    <MarcoEmpresa empresaId={empresa.id}>
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Header
        nombreSesion={sesion.perfil?.nombre ?? sesion.correo}
          logoEmpresaId={empresa.id}
        logoEsTitulo
        etlStatus={etlStatus}
        titulo={empresa.nombreCorto}
        subtitulo="Indicadores por área"
        volverA="/"
        volverTexto="Empresas"
      />

      <PanelLogistica resumen={resumen} empresa={empresa} />
      <PanelVentas kpis={ventasKpis} empresa={empresa} nombreMes={nombreMesVentas} isUltimoMes={isUltimoMesVentas} />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-scale-lg font-semibold text-text-primary">Otras áreas</h2>
          <span className="text-scale-xs text-text-muted">
            {AREAS_PENDIENTES.length} pendientes de integrar
          </span>
        </div>

        <div data-tour="areas-pendientes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...AREAS_ACTIVAS_SIN_PANEL, ...AREAS_PENDIENTES].map((area) => (
            <AreaCard key={area.id} area={area} empresaId={empresa.id} />
          ))}
        </div>

        <p className="mt-6 text-scale-sm text-text-muted">
          Cada área se integra cuando sus indicadores están definidos con el responsable
          correspondiente. Las tarjetas sin cifras todavía no tienen datos conectados.
        </p>
      </section>

      <Tour pasos={getTourEmpresa(empresa)} llaveStorage={`${LLAVE_TOUR_EMPRESA}-${empresa.id}`} />
    </main>
    </MarcoEmpresa>
  )
}
