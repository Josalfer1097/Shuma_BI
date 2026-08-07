import type { ReporteRow } from './types'
import { aggregate } from './aggregate'
import { formatDecimal, formatNumber, equivalenciaHoras } from './format'

/**
 * Hallazgos del periodo.
 *
 * Todo lo que sale de aqui es un hecho calculado sobre las filas que el
 * tablero ya tiene en memoria: se puede auditar contra la tabla de Supabase.
 *
 * DELIBERADAMENTE no hay recomendaciones de operacion. El tablero no sabe
 * cuantos camiones hay, ni que cuesta uno, ni que paso ese mes; una sugerencia
 * equivocada le cuesta la credibilidad a todo el proyecto. El tablero senala
 * que cambio y que esta fuera de lo normal; quien lo presenta explica por que.
 */

export type TipoHallazgo = 'cambio' | 'atipico' | 'dato'
export type Tono = 'bueno' | 'malo' | 'neutro'

export interface Hallazgo {
  tipo: TipoHallazgo
  tono: Tono
  titulo: string
  detalle: string
}

const ETAPAS: { clave: keyof ReporteRow; nombre: string }[] = [
  { clave: 'med_cot_autorizacion', nombre: 'Autorización' },
  { clave: 'med_autorizacion_recepcion', nombre: 'Autorización a recepción' },
  { clave: 'med_recepcion_surtido', nombre: 'Recepción a surtido' },
  { clave: 'med_surtido_ruta', nombre: 'Surtido a ruta' },
  { clave: 'med_ruta_entrega', nombre: 'Ruta a entrega' },
  { clave: 'med_entrega_validacion', nombre: 'Entrega a validación' },
]

/** Mes anterior en formato YYYY-MM. */
function mesAnterior(anioMes: string): string {
  const [a, m] = anioMes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function conEquivalencia(dias: number): string {
  const horas = equivalenciaHoras(dias)
  return horas ? `${formatDecimal(dias)} d (${horas})` : `${formatDecimal(dias)} d`
}

export function calcularHallazgos(
  filas: ReporteRow[],
  meta: number,
  usaZonas: boolean,
  mesParcial: string | null
): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  if (filas.length === 0) return hallazgos

  const meses = Array.from(new Set(filas.map((f) => f.anio_mes))).sort()
  const global = aggregate(filas, meta)
  if (!global) return hallazgos

  // ---------- QUE CAMBIO ----------
  // Se compara el ultimo mes completo, no el mes en curso: el parcial trae
  // pocos dias y cualquier comparacion con el seria enganosa.
  const mesesCompletos = meses.filter((m) => m !== mesParcial)
  const ultimo = mesesCompletos[mesesCompletos.length - 1]
  const previo = ultimo ? mesAnterior(ultimo) : null

  if (ultimo && previo && meses.includes(previo)) {
    const aUlt = aggregate(filas.filter((f) => f.anio_mes === ultimo), meta)
    const aPrev = aggregate(filas.filter((f) => f.anio_mes === previo), meta)

    if (aUlt && aPrev) {
      const delta = aUlt.mediana_dias - aPrev.mediana_dias
      if (Math.abs(delta) >= 0.1) {
        hallazgos.push({
          tipo: 'cambio',
          tono: delta > 0 ? 'malo' : 'bueno',
          titulo: `El tiempo típico ${delta > 0 ? 'subió' : 'bajó'} ${formatDecimal(Math.abs(delta))} d contra el mes anterior`,
          detalle: `${previo}: ${conEquivalencia(aPrev.mediana_dias)}. ${ultimo}: ${conEquivalencia(aUlt.mediana_dias)}.`,
        })
      }

      // Etapa que mas se movio entre los dos meses
      let mayor: { nombre: string; delta: number; antes: number; ahora: number } | null = null
      for (const etapa of ETAPAS) {
        const antes = (aPrev[etapa.clave as keyof typeof aPrev] as number | null) ?? 0
        const ahora = (aUlt[etapa.clave as keyof typeof aUlt] as number | null) ?? 0
        const d = ahora - antes
        if (!mayor || Math.abs(d) > Math.abs(mayor.delta)) {
          mayor = { nombre: etapa.nombre, delta: d, antes, ahora }
        }
      }
      if (mayor && Math.abs(mayor.delta) >= 0.05) {
        hallazgos.push({
          tipo: 'cambio',
          tono: mayor.delta > 0 ? 'malo' : 'bueno',
          titulo: `${mayor.nombre} es la etapa que más se movió`,
          detalle: `De ${conEquivalencia(mayor.antes)} a ${conEquivalencia(mayor.ahora)} entre ${previo} y ${ultimo}.`,
        })
      }
    }
  }

  // Mismo mes del ano pasado
  if (ultimo) {
    const [a, m] = ultimo.split('-')
    const hace12 = `${Number(a) - 1}-${m}`
    if (meses.includes(hace12)) {
      const aUlt = aggregate(filas.filter((f) => f.anio_mes === ultimo), meta)
      const aAnio = aggregate(filas.filter((f) => f.anio_mes === hace12), meta)
      if (aUlt && aAnio) {
        const delta = aUlt.mediana_dias - aAnio.mediana_dias
        if (Math.abs(delta) >= 0.1) {
          hallazgos.push({
            tipo: 'cambio',
            tono: delta > 0 ? 'malo' : 'bueno',
            titulo: `Contra el mismo mes del año pasado, ${delta > 0 ? 'subió' : 'bajó'} ${formatDecimal(Math.abs(delta))} d`,
            detalle: `${hace12}: ${conEquivalencia(aAnio.mediana_dias)}. ${ultimo}: ${conEquivalencia(aUlt.mediana_dias)}.`,
          })
        }
      }
    }
  }

  // ---------- QUE ESTA FUERA DE LO NORMAL ----------
  // Meses donde el promedio dobla a la mediana: no es que la operacion
  // empeorara, es que hubo un grupo pequeno de entregas muy lentas.
  const mesesAtipicos = mesesCompletos.filter((m) => {
    const a = aggregate(filas.filter((f) => f.anio_mes === m), meta)
    return a !== null && a.mediana_dias > 0 && a.promedio_dias > a.mediana_dias * 2
  })
  if (mesesAtipicos.length > 0) {
    hallazgos.push({
      tipo: 'atipico',
      tono: 'malo',
      titulo: `${mesesAtipicos.length} ${mesesAtipicos.length === 1 ? 'mes tiene' : 'meses tienen'} entregas muy atípicas`,
      detalle: `${mesesAtipicos.join(', ')}. En esos meses el promedio dobla a la mediana: un grupo pequeño de entregas muy lentas, no un empeoramiento general.`,
    })
  }

  // Zonas fuera de meta, y cuantos meses seguidos llevan asi
  if (usaZonas) {
    const zonas = Array.from(new Set(filas.map((f) => f.zona)))
    const fuera: string[] = []
    for (const zona of zonas) {
      const a = aggregate(filas.filter((f) => f.zona === zona), meta)
      if (a && a.mediana_dias > meta) fuera.push(`${zona} (${formatDecimal(a.mediana_dias)} d)`)
    }
    if (fuera.length > 0) {
      hallazgos.push({
        tipo: 'atipico',
        tono: 'malo',
        titulo: `${fuera.length} de ${zonas.length} zonas están arriba de la meta de ${meta} días`,
        detalle: fuera.join(' · '),
      })
    }
  }

  // ---------- QUE MIRAR CON CALMA ----------
  const excluidas = filas.reduce((s, f) => s + (f.excluidas_dormancia ?? 0), 0)
  if (excluidas > 0) {
    const pct = (excluidas / (global.total + excluidas)) * 100
    hallazgos.push({
      tipo: 'dato',
      tono: 'neutro',
      titulo: `${formatNumber(excluidas)} entregas quedaron fuera del cálculo`,
      detalle: `Son el ${formatDecimal(pct)}% del total. Su cotización tardó más de un mes en salir a ruta, y ese tiempo es de decisión del cliente, no de la operación.`,
    })
  }

  const surtido = global.med_recepcion_surtido ?? 0
  if (surtido < 0.01) {
    hallazgos.push({
      tipo: 'dato',
      tono: 'neutro',
      titulo: 'La etapa de surtido no es medible',
      detalle:
        'El sistema registra la recepción y el surtido casi en el mismo momento, así que entre ambos no hay tiempo que medir. La barra sale vacía por eso, no por falta de datos.',
    })
  }

  const factura = global.med_entrega_factura
  if (factura !== null && factura < 0) {
    hallazgos.push({
      tipo: 'dato',
      tono: 'neutro',
      titulo: 'La facturación ocurre después de la entrega',
      detalle: `Mediana de ${conEquivalencia(Math.abs(factura))} después de entregar. El material sale con remisión y se factura por lote al cierre del día: así opera el negocio, no es un retraso.`,
    })
  }

  if (mesParcial) {
    hallazgos.push({
      tipo: 'dato',
      tono: 'neutro',
      titulo: `${mesParcial} está incompleto`,
      detalle:
        'Los datos cierran al día anterior, así que el mes en curso lleva solo unos días de operación. Su caída de volumen es esperada.',
    })
  }

  return hallazgos
}
