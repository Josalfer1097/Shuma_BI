import { Suspense } from 'react'
import type { Metadata } from 'next'
import { crearClienteServidor } from '@/lib/supabase-server'
import { obtenerSesion } from '@/lib/auth'
import { Header } from '@/components/Header'
import { Dashboard } from '@/components/logistica/Dashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tour } from '@/components/Tour'
import { getTourLogistica, LLAVE_TOUR_LOGISTICA } from '@/lib/tours'
import { buscarEmpresa } from '@/lib/empresas'
import { EmpresaProvider } from '@/lib/empresaContext'
import { notFound } from 'next/navigation'

export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: { empresa: string }
}): Promise<Metadata> {
  const empresa = buscarEmpresa(params.empresa)
  return {
    title: empresa
      ? `Logística ${empresa.nombreCorto} | Tablero Operativo Shuma`
      : 'Logística | Tablero Operativo Shuma',
  }
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-16 w-full mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

export default async function Page({ params }: { params: { empresa: string } }) {
  const empresaId = params.empresa.toLowerCase()
  const empresaObj = buscarEmpresa(empresaId)

  if (!empresaObj) {
    notFound()
  }

  const supabase = crearClienteServidor()
  const sesion = await obtenerSesion()

  const [reporteRes, etlRes] = await Promise.all([
    supabase.from('reporte_tiempos_zona_mes').select('*').eq('empresa', empresaId),
    // maybeSingle y no single: una empresa sin corridas registradas devuelve
    // cero filas, y con single eso seria un error.
    supabase.from('etl_status').select('*').eq('empresa', empresaId).maybeSingle()
  ])

  // Solo el reporte es indispensable. Que falte el estado de la actualizacion
  // es informacion secundaria y no debe impedir ver los datos.
  if (reporteRes.error || !reporteRes.data) {
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
            href={`/${empresaId}/logistica`}
            className="block w-full bg-accent hover:bg-accent-deep text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Reintentar
          </a>
        </div>
      </div>
    )
  }

  return (
    <EmpresaProvider empresa={empresaObj}>
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <Header
          nombreSesion={sesion.perfil?.nombre ?? sesion.correo}
          etlStatus={etlRes.error ? null : etlRes.data}
          titulo="Tiempos de Entrega"
          subtitulo={`${empresaObj.nombre} — Grupo Shuma`}
          volverA={`/${empresaId}`}
          volverTexto={empresaObj.nombreCorto}
        />
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard initialData={reporteRes.data} />
        </Suspense>

        <Tour pasos={getTourLogistica(empresaObj)} llaveStorage={`${LLAVE_TOUR_LOGISTICA}_${empresaId}`} />
      </main>
    </EmpresaProvider>
  )
}
