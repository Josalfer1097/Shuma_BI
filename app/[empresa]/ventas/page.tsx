import { Suspense } from 'react'
import type { Metadata } from 'next'
import { crearClienteServidor } from '@/lib/supabase-server'
import { obtenerSesion, puedeVer } from '@/lib/auth'
import { Header } from '@/components/Header'
import { Dashboard } from '@/components/ventas/Dashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tour } from '@/components/Tour'
import { buscarEmpresa } from '@/lib/empresas'
import { EmpresaProvider } from '@/lib/empresaContext'
import { MarcoEmpresa } from '@/components/MarcoEmpresa'
import { notFound, redirect } from 'next/navigation'
import { SupabaseClient } from '@supabase/supabase-js'
import type { FilaMensual, FilaRankingVista, VentaRow } from '@/lib/ventas'

export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: { empresa: string }
}): Promise<Metadata> {
  const empresa = buscarEmpresa(params.empresa)
  return {
    title: empresa
      ? `Ventas ${empresa.nombreCorto} | Tablero Operativo Shuma`
      : 'Ventas | Tablero Operativo Shuma',
  }
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-16 w-full mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

async function traerTodo<T>(supabase: SupabaseClient, vista: string, empresa: string, dimensiones?: string[]) {
  const BLOQUE = 1000
  const filas: T[] = []
  for (let desde = 0; ; desde += BLOQUE) {
    let query = supabase.from(vista).select('*').eq('empresa', empresa)
    if (dimensiones) {
      query = query.in('dimension', dimensiones)
    }
    const { data, error } = await query.range(desde, desde + BLOQUE - 1)
    if (error) throw error
    filas.push(...((data ?? []) as T[]))
    if (!data || data.length < BLOQUE) break
  }
  return filas
}

async function traerDetalleMes(supabase: SupabaseClient, empresa: string, anio: string, mes: string, dimension: string) {
  const BLOQUE = 1000
  const filas: VentaRow[] = []
  const fechaInicio = `${anio}-${mes}-01`
  // Calculamos fecha fin (primer día del siguiente mes)
  const fechaFinDate = new Date(parseInt(anio), parseInt(mes) - 1, 1) // fix month offset for Date
  fechaFinDate.setMonth(fechaFinDate.getMonth() + 1)
  const anioFin = fechaFinDate.getFullYear()
  const mesFin = String(fechaFinDate.getMonth() + 1).padStart(2, '0')
  const fechaFin = `${anioFin}-${mesFin}-01`

  for (let desde = 0; ; desde += BLOQUE) {
    const { data, error } = await supabase
      .from('ventas_agregado')
      .select('*')
      .eq('empresa', empresa)
      .eq('dimension', dimension)
      .gte('fecha_cotizacion', fechaInicio)
      .lt('fecha_cotizacion', fechaFin)
      .range(desde, desde + BLOQUE - 1)
    if (error) throw error
    filas.push(...((data ?? []) as VentaRow[]))
    if (!data || data.length < BLOQUE) break
  }
  return filas
}

export default async function Page({ 
  params, 
  searchParams 
}: { 
  params: { empresa: string }
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  const empresaId = params.empresa.toLowerCase()
  const empresaObj = buscarEmpresa(empresaId)

  if (!empresaObj) {
    notFound()
  }

  const supabase = crearClienteServidor()
  const sesion = await obtenerSesion()

  if (!puedeVer(sesion, empresaId, 'ventas')) redirect('/sin-acceso')

  const anioParam = typeof searchParams.anio === 'string' ? searchParams.anio : null
  const mesParam = typeof searchParams.mes === 'string' ? searchParams.mes : null
  const dimensionParam = typeof searchParams.dimension === 'string' ? searchParams.dimension : 'cliente'

  const [mensualRes, rankingRes, etlRes] = await Promise.all([
    supabase.from('v_ventas_mensual').select('*').eq('empresa', empresaId),
    Promise.all([
      traerTodo<FilaRankingVista>(supabase, 'v_ventas_ranking', empresaId, ['cliente', 'vendedor']),
      supabase.from('v_ventas_ranking')
        .select('*')
        .eq('empresa', empresaId)
        .eq('dimension', 'producto')
        .order('imp_reng_max', { ascending: false })
        .limit(20)
    ]).then(([base, prod]) => {
      if (prod.error) throw prod.error
      return { data: [...base, ...(prod.data as FilaRankingVista[])], error: null }
    }).catch(error => ({ data: null, error })),
    supabase.from('etl_estado').select('*').eq('empresa', empresaId).eq('area', 'ventas').maybeSingle(),
  ])

  let detalleMes: VentaRow[] | null = null
  let detalleError = null
  if (anioParam && mesParam) {
    try {
      detalleMes = await traerDetalleMes(supabase, empresaId, anioParam, mesParam, dimensionParam)
    } catch (e) {
      detalleError = e
    }
  }

  if (mensualRes.error || !mensualRes.data || rankingRes.error || detalleError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
        <div className="max-w-md w-full bg-bg-surface border border-border rounded-lg p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-scale-xl font-semibold text-text-primary mb-2">No se pudieron cargar los datos</h2>
          <p className="text-text-muted mb-6 text-scale-sm">
            Hubo un problema al conectar con la base de datos de Grupo Shuma. Por favor intenta de nuevo en unos minutos.
          </p>
          <a 
            href={`/${empresaId}/ventas`}
            className="block w-full bg-accent hover:bg-accent-deep text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Reintentar
          </a>
        </div>
      </div>
    )
  }

  // tour llave needs a ventas one, let's just create a generic one or use the same pattern
  const llaveTour = `tour_ventas_${empresaId}`
  // Let's create some default steps for tour if needed. I'll just pass an empty array if not defined yet.
  
  return (
    <EmpresaProvider empresa={empresaObj}>
      <MarcoEmpresa empresaId={empresaId}>
        <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Header
            nombreSesion={sesion.perfil?.nombre ?? sesion.correo}
            logoEmpresaId={empresaId}
            etlStatus={etlRes.error ? null : etlRes.data}
            titulo="Ventas"
            subtitulo="Colocación, conversión de cotizaciones y comportamiento por zona"
            volverA={`/${empresaId}`}
            volverTexto={empresaObj.nombreCorto}
          />
          <Suspense fallback={<DashboardSkeleton />}>
            <Dashboard 
              mensual={mensualRes.data as FilaMensual[]} 
              ranking={rankingRes.data as FilaRankingVista[]} 
              detalleMes={detalleMes}
              anioParam={anioParam}
              mesParam={mesParam}
            />
          </Suspense>

          <Tour pasos={[]} llaveStorage={llaveTour} />
        </main>
      </MarcoEmpresa>
    </EmpresaProvider>
  )
}
