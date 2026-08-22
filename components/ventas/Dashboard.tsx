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
  PuntoSerie,
  formatMonedaCorta,
  enriquecerConUltimaFactura
} from '@/lib/ventas'
import { construirHallazgos } from '@/lib/hallazgosVentas'
import { FilterBar } from './FilterBar'
import { KpiRow } from './KpiRow'
import { TrendChart } from './TrendChart'
import { RankingTable } from './RankingTable'
import { Glossary } from './Glossary'
import { PanelEmbudo } from './PanelEmbudo'
import { PanelConcentracion } from './PanelConcentracion'
import { PanelHallazgos } from './PanelHallazgos'
import { PanelVendedores } from './PanelVendedores'

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
}

interface DashboardProps {
  mensual: FilaMensual[]
  ranking: FilaRankingVista[]
  detalleMes: VentaRow[] | null
  anioParam: string | null
  mesParam: string | null
  defaultAnio?: string | null
  defaultMes?: string | null
}

export function Dashboard({ 
  mensual, 
  ranking, 
  detalleMes, 
  anioParam, 
  mesParam,
  defaultAnio,
  defaultMes
}: DashboardProps) {
  const [isPending, startTransition] = React.useTransition()
  
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

  // KPIs específicos para Abandonado y Mostrador
  let kpisExterno = null
  let kpisMostrador = null
  if (rowsDetalle) {
    kpisExterno = calcularKpis(rowsDetalle.filter(r => r.canal === 'externo'), dimensionParam)
    kpisMostrador = calcularKpis(rowsDetalle.filter(r => r.canal === 'mostrador'), dimensionParam)
  } else if (entidadParam && dimensionParam !== 'producto') {
    kpisExterno = calcularKpis(rowsRanking.filter(r => r.canal === 'externo'), dimensionParam)
    kpisMostrador = calcularKpis(rowsRanking.filter(r => r.canal === 'mostrador'), dimensionParam)
  } else {
    kpisExterno = calcularKpis(rowsMensual.filter(r => r.canal === 'externo'), dimensionParam)
    kpisMostrador = calcularKpis(rowsMensual.filter(r => r.canal === 'mostrador'), dimensionParam)
  }

  // Serie de tiempo
  let serie: PuntoSerie[] = []
  let serieFull: PuntoSerie[] | undefined
  if (entidadParam && dimensionParam !== 'producto') {
    if (rowsDetalle) {
      serie = serieMensual(rowsDetalle, dimensionParam)
    } else {
      // Sin detalle, no tenemos serie de tiempo para una entidad específica
      serie = []
    }
  } else {
    let mensualParaGrafica = mensual
    let mensualParaGraficaFull = mensual
    if (canalParam) {
      mensualParaGrafica = mensualParaGrafica.filter(r => r.canal === canalParam)
      mensualParaGraficaFull = mensualParaGraficaFull.filter(r => r.canal === canalParam)
    }
    if (anioParam) {
      mensualParaGrafica = mensualParaGrafica.filter(r => r.anio_mes.startsWith(`${anioParam}-`))
    }
    serie = serieMensualDesdeVista(mensualParaGrafica)
    serieFull = serieMensualDesdeVista(mensualParaGraficaFull)
  }

  const maxAnioMes = mensual.reduce((max, row) => (row.anio_mes > max ? row.anio_mes : max), '')
  const isUltimoMes = mesSeleccionado === maxAnioMes
  const partialMonth = isUltimoMes ? mesSeleccionado : null

  // Fetch dynamic ranking for productos
  const params = useParams()
  const empresaId = typeof params?.empresa === 'string' ? params.empresa.toLowerCase() : ''
  const [productosRanking, setProductosRanking] = React.useState<FilaRankingVista[] | null>(null)
  const [cargandoProductos, setCargandoProductos] = React.useState(false)

  const activeAnio = anioParam === 'Todos' ? 'Todos' : (anioParam || defaultAnio || 'Todos')
  const activeMes = mesParam === 'Todos' ? 'Todos' : (mesParam || defaultMes || 'Todos')

  const isPeriodoAll = activeAnio === 'Todos' && activeMes === 'Todos'
  const periodoLabel = isPeriodoAll 
    ? "Histórico completo" 
    : `${activeMes !== 'Todos' ? MONTHS_ES[activeMes] || activeMes : ''} ${activeAnio !== 'Todos' ? activeAnio : ''}`.trim()

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
    const rawRanking = construirRanking(rowsDetalle, dimensionParam)
    dataRanking = enriquecerConUltimaFactura(rawRanking, rowsRanking, dimensionParam)
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

  // Clientes Dormidos
  let dormidosRiesgo = 0
  let dormidosPerdidos = 0
  let dormidosMonto = 0
  const dormidosDetalle: { nombre: string, monto: number, dias: number }[] = []
  
  if (ranking) {
    const ahora = new Date()
    ahora.setHours(0, 0, 0, 0)
    
    const candidatos = ranking.filter(r => 
      r.dimension === 'cliente' &&
      r.canal === 'externo' &&
      r.imp_facturado >= 500000 &&
      r.ultima_factura
    )

    candidatos.forEach(r => {
      const fechaFac = new Date(r.ultima_factura as string)
      fechaFac.setHours(0, 0, 0, 0)
      
      const diffTime = ahora.getTime() - fechaFac.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays >= 90) {
        if (diffDays > 180) {
          dormidosPerdidos++
        } else {
          dormidosRiesgo++
        }
        dormidosMonto += r.imp_facturado
        dormidosDetalle.push({ nombre: r.dimension_nombre, monto: r.imp_facturado, dias: diffDays })
      }
    })
    
    dormidosDetalle.sort((a, b) => b.monto - a.monto)
  }
  const totalDormidos = dormidosRiesgo + dormidosPerdidos

  let txtMayores = ''
  if (dormidosDetalle.length > 0) {
    const top3 = dormidosDetalle.slice(0, 3)
    if (top3.length === 1) {
      txtMayores = `El mayor es ${top3[0].nombre}, ${formatMonedaCorta(top3[0].monto)}, ${top3[0].dias} días sin comprar.`
    } else {
      txtMayores = `Los mayores son ${top3.map(d => `${d.nombre} (${formatMonedaCorta(d.monto)}, ${d.dias} días)`).join(', ')}.`
    }
  }

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
      <FilterBar 
        mensual={mensual} 
        opcionesEntidad={opcionesEntidad}
        defaultAnio={defaultAnio}
        defaultMes={defaultMes}
        isPending={isPending}
        startTransition={startTransition}
      />
      
      <div className={`transition-opacity duration-300 ease-in-out ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex justify-end mb-4">
        <PanelHallazgos hallazgos={hallazgos} />
      </div>

      <div data-tour="kpis-cierre">
        <KpiRow 
          kpis={kpis} 
          kpisExterno={kpisExterno}
          kpisMostrador={kpisMostrador}
          canalParam={canalParam}
          isUltimoMes={isUltimoMes}
          partialMonth={partialMonth} 
        />
      </div>

      {totalDormidos > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-bg-surface p-4 text-scale-sm">
          <p className="text-text-secondary">
            <strong className="text-text-primary font-semibold">{totalDormidos} clientes dormido{totalDormidos !== 1 ? 's' : ''}, {formatMonedaCorta(dormidosMonto)}.</strong>{' '}
            {dormidosPerdidos} perdido{dormidosPerdidos !== 1 ? 's' : ''} con más de 180 días y {dormidosRiesgo} en riesgo. {txtMayores}
          </p>
        </div>
      )}
      
      <TrendChart 
        data={serie} 
        dataFull={serieFull}
        selectedMonth={mesSeleccionado} 
        partialMonth={partialMonth}
        anclaTour="tendencia" 
      />
      
      <PanelEmbudo ranking={ranking} />
      
      <PanelConcentracion data={dataRanking} dimension={dimensionParam} />
      
      <PanelVendedores ranking={ranking} entidadParam={entidadParam} />
      
      <RankingTable 
        data={dataRanking} 
        dimension={dimensionParam} 
        cargando={cargandoRanking}
        periodoLabel={periodoLabel}
      />
      
      <Glossary />
      </div>
    </>
  )
}
