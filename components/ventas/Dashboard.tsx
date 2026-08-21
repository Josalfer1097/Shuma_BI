'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  FilaMensual, 
  FilaRankingVista, 
  VentaRow, 
  Dimension, 
  Canal,
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

  // Ranking
  // Dependiendo de si hay detalle o no.
  let dataRanking = []
  if (rowsDetalle) {
    dataRanking = construirRanking(rowsDetalle, dimensionParam)
  } else {
    // Filtramos la vista de ranking por año/mes si es necesario.
    const rankingFiltrado = rowsRanking
    if (mesSeleccionado) {
      // v_ventas_ranking no tiene anio_mes, tiene fecha de ultima_actividad.
      // Así que si no hay detalle, no se puede filtrar el ranking por mes exacto desde la vista 
      // (a menos que hagamos un split, pero ultima_actividad es la ultima vez que compró, no la fecha de la venta en sí).
      // Por eso el prompt dice que para el detalle de un mes se USE ventas_agregado (rowsDetalle).
    } else if (anioParam) {
      // Si solo filtraron año, el ranking tampoco es preciso porque v_ventas_ranking es histórico completo.
      // Pero igual se muestra.
    }
    dataRanking = construirRankingDesdeVista(rankingFiltrado, dimensionParam)
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
      />
      
      <Glossary />
    </>
  )
}
