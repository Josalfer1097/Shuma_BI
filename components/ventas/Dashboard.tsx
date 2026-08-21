'use client'

import React from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { 
  calcularKpis, 
  construirRanking, 
  construirRankingDesdeVista, 
  serieMensualDesdeVista,
  serieMensual,
  FilaMensual, 
  FilaRankingVista, 
  FilaRanking,
  VentaRow,
  Dimension,
  Canal,
  PuntoSerie
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
  const entidadParam = searchParams.get('entidad')

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
    rowsMensual = rowsMensual.filter(r => r.anio_mes === mesSeleccionado)
  } else if (anioParam && !mesParam) {
    rowsMensual = rowsMensual.filter(r => r.anio_mes.startsWith(`${anioParam}-`))
  }

  // Si hay entidadParam y la dimensión no es producto, filtramos en memoria
  if (entidadParam && dimensionParam !== 'producto') {
    rowsRanking = rowsRanking.filter(r => r.dimension_id === entidadParam)
    if (rowsDetalle) {
      rowsDetalle = rowsDetalle.filter(r => r.dimension_id === entidadParam)
    }
  }

  // Calculo de KPIs
  let kpis = null
  if (rowsDetalle) {
    kpis = calcularKpis(rowsDetalle, dimensionParam)
  } else if (entidadParam && dimensionParam !== 'producto') {
    // Si hay entidad pero no detalle, calculamos KPIs desde el ranking filtrado
    kpis = calcularKpis(rowsRanking, dimensionParam)
  } else {
    kpis = calcularKpis(rowsMensual, dimensionParam)
  }

  // Serie de tiempo
  let serie: PuntoSerie[] = []
  if (entidadParam && dimensionParam !== 'producto') {
    if (rowsDetalle) {
      serie = serieMensual(rowsDetalle, dimensionParam)
    } else {
      // Sin detalle, no tenemos serie de tiempo para una entidad específica
      serie = []
    }
  } else {
    let mensualParaGrafica = mensual
    if (canalParam) {
      mensualParaGrafica = mensualParaGrafica.filter(r => r.canal === canalParam)
    }
    if (anioParam) {
      mensualParaGrafica = mensualParaGrafica.filter(r => r.anio_mes.startsWith(`${anioParam}-`))
    }
    serie = serieMensualDesdeVista(mensualParaGrafica)
  }

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

  // Opciones para el selector de entidad en FilterBar
  // Usamos el `ranking` original pasado en props (filtrado solo por canal) para tener todas las opciones.
  let rankingParaOpciones = ranking
  if (canalParam) {
    rankingParaOpciones = rankingParaOpciones.filter(r => r.canal === canalParam)
  }
  const opcionesEntidad = construirRankingDesdeVista(rankingParaOpciones, dimensionParam)

  // Hallazgos
  let mensualParaHallazgos = mensual
  let rankingParaHallazgos = ranking // Este `ranking` es la prop original
  if (canalParam) {
    mensualParaHallazgos = mensualParaHallazgos.filter(r => r.canal === canalParam)
    rankingParaHallazgos = rankingParaHallazgos.filter(r => r.canal === canalParam)
  }
  if (entidadParam && dimensionParam !== 'producto') {
    rankingParaHallazgos = rankingParaHallazgos.filter(r => r.dimension_id === entidadParam)
  }
  const hallazgos = construirHallazgos(mensualParaHallazgos, rankingParaHallazgos, mesSeleccionado)

  return (
    <>
      <FilterBar mensual={mensual} opcionesEntidad={opcionesEntidad} />
      
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
