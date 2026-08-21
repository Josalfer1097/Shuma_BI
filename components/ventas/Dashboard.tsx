'use client'

import React from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { 
  FilaMensual, 
  FilaRankingVista, 
  VentaRow, 
  Dimension, 
  Canal,
  FilaRanking,
  calcularKpis,
  serieMensualDesdeVista,
  construirRanking,
  construirRankingDesdeVista
} from '@/lib/ventas'
import { construirHallazgos } from '@/lib/hallazgosVentas'
import { FilterBar } from './FilterBar'
import { KpiRow } from './KpiRow'
import { TrendChart } from './TrendChart'
import { RankingTable } from './RankingTable'
import { Glossary } from './Glossary'
import { PanelHallazgos } from './PanelHallazgos'

interface DashboardProps {
  mensual: FilaMensual[]
  ranking: FilaRankingVista[]
  detalleMes: VentaRow[] | null
  anioParam: string | null
  mesParam: string | null
}

export function Dashboard({ mensual, ranking, detalleMes, anioParam, mesParam }: DashboardProps) {
  const searchParams = useSearchParams()
  const canalParam = searchParams.get('canal') as Canal | null
  const dimensionParam = (searchParams.get('dimension') as Dimension) || 'cliente'

  // Filtrado por canal
  let rowsMensual = mensual
  let rowsRanking = ranking
  let rowsDetalle = detalleMes

  if (canalParam) {
    rowsMensual = rowsMensual.filter(r => r.canal === canalParam)
    rowsRanking = rowsRanking.filter(r => r.canal === canalParam)
    if (rowsDetalle) {
      rowsDetalle = rowsDetalle.filter(r => r.canal === canalParam)
    }
  }

  // Filtrado por año/mes sobre las vistas (si no hay detalle)
  const mesSeleccionado = anioParam && mesParam ? `${anioParam}-${mesParam}` : null
  
  if (mesSeleccionado && !rowsDetalle) {
    // Si por alguna razon no hay detalleMes pero si hay params, filtramos la vista mensual
    rowsMensual = rowsMensual.filter(r => r.anio_mes === mesSeleccionado)
  } else if (anioParam && !mesParam) {
    // Si solo hay año, filtramos por año
    rowsMensual = rowsMensual.filter(r => r.anio_mes.startsWith(`${anioParam}-`))
  }

  // Calculo de KPIs
  // Si hay detalleMes (filtraron por mes), usamos el detalle y la dimension seleccionada.
  // Si no, usamos la vista mensual. Al usar la vista mensual forzamos 'cliente' para que
  // cotizacionesSumables sea true, porque v_ventas_mensual ya está correctamente agregada.
  let kpis = null
  if (rowsDetalle) {
    // Si el usuario cambia la dimensión a 'producto', calcularKpis devolverá null en cotizaciones
    // porque las cotizaciones no son sumables por producto.
    kpis = calcularKpis(rowsDetalle, dimensionParam)
  } else {
    // Si no hay detalle, calculamos los KPIs sobre la vista mensual.
    // OJO: si eligieron dimensión 'producto', deberíamos ocultar cotizaciones. 
    // Como la vista mensual no tiene dimensión, pasamos dimensionParam para que la regla de sumabilidad aplique.
    kpis = calcularKpis(rowsMensual, dimensionParam)
  }

  // Serie de tiempo (siempre es mensual)
  // Usamos el dataset sin filtrar por mes para poder ver la tendencia, 
  // a menos que hayan filtrado solo por año, en cuyo caso rowsMensual ya está filtrado por ese año.
  // Pero para la grafica queremos el año completo o todo. 
  // Para simplificar y seguir el patrón, le pasamos rowsMensual (que si tiene año, mostrará solo ese año).
  // Si tiene mes, rowsMensual está filtrado a un mes? No, arriba filtramos rowsMensual solo si !rowsDetalle.
  // En logística, TrendChart recibe los datos filtrados por año, pero NO por mes, para que se vea el mes resaltado en su contexto.
  
  let mensualParaGrafica = mensual
  if (canalParam) {
    mensualParaGrafica = mensualParaGrafica.filter(r => r.canal === canalParam)
  }
  if (anioParam) {
    mensualParaGrafica = mensualParaGrafica.filter(r => r.anio_mes.startsWith(`${anioParam}-`))
  }
  const serie = serieMensualDesdeVista(mensualParaGrafica)

  // Fetch dynamic ranking for productos
  const params = useParams()
  const empresaId = typeof params?.empresa === 'string' ? params.empresa.toLowerCase() : ''
  const [productosRanking, setProductosRanking] = React.useState<FilaRankingVista[] | null>(null)
  const [cargandoProductos, setCargandoProductos] = React.useState(false)

  React.useEffect(() => {
    if (dimensionParam === 'producto' && !rowsDetalle && !productosRanking && !cargandoProductos && empresaId) {
      setCargandoProductos(true)
      import('@/app/[empresa]/ventas/actions').then(m => {
        m.traerRankingProductoAction(empresaId).then(data => {
          setProductosRanking(data)
          setCargandoProductos(false)
        }).catch(err => {
          console.error(err)
          setCargandoProductos(false)
        })
      })
    }
  }, [dimensionParam, rowsDetalle, productosRanking, cargandoProductos, empresaId])

  // Ranking
  // Dependiendo de si hay detalle o no.
  let dataRanking: FilaRanking[] = []
  let cargandoRanking = false

  if (rowsDetalle) {
    dataRanking = construirRanking(rowsDetalle, dimensionParam)
  } else {
    if (dimensionParam === 'producto') {
      if (!productosRanking) {
        cargandoRanking = true
      } else {
        let rankingFiltrado = productosRanking
        if (canalParam) {
          rankingFiltrado = rankingFiltrado.filter(r => r.canal === canalParam)
        }
        dataRanking = construirRankingDesdeVista(rankingFiltrado, dimensionParam)
      }
    } else {
      const rankingFiltrado = rowsRanking
      dataRanking = construirRankingDesdeVista(rankingFiltrado, dimensionParam)
    }
  }

  // Hallazgos
  // Construir hallazgos necesita mensual y ranking sin filtrar por mes, 
  // porque adentro hace las comparaciones contra el mes anterior.
  let mensualParaHallazgos = mensual
  let rankingParaHallazgos = ranking
  if (canalParam) {
    mensualParaHallazgos = mensualParaHallazgos.filter(r => r.canal === canalParam)
    rankingParaHallazgos = rankingParaHallazgos.filter(r => r.canal === canalParam)
  }
  const hallazgos = construirHallazgos(mensualParaHallazgos, rankingParaHallazgos, mesSeleccionado)

  return (
    <>
      <FilterBar mensual={mensual} />
      
      <div className="flex justify-end mb-4">
        <PanelHallazgos hallazgos={hallazgos} />
      </div>

      <KpiRow kpis={kpis} />
      
      <TrendChart 
        data={serie} 
        selectedMonth={mesSeleccionado} 
        anclaTour="ventas-tendencia" 
      />
      
      <RankingTable 
        data={dataRanking} 
        dimension={dimensionParam} 
        cargando={cargandoRanking}
      />
      
      <Glossary />
    </>
  )
}
