import type { PasoTour } from '@/components/Tour'
import type { Empresa } from './empresas'

/**
 * Contenido de los recorridos guiados.
 *
 * El publico es direccion y gerentes: gente que abre esto pocas veces y
 * necesita saber que esta viendo, no aprender a usar una herramienta.
 *
 * Por eso el recorrido NO repite el glosario ni las descripciones de los
 * indicadores, que ya viven en la pagina. Explica las trampas de lectura:
 * lo que alguien podria malinterpretar mirando el tablero sin contexto.
 */

export const LLAVE_TOUR_PORTADA = 'shuma-bi-tour-portada'
export const LLAVE_TOUR_EMPRESA = 'shuma-bi-tour-empresa'
export const LLAVE_TOUR_LOGISTICA = 'shuma-bi-tour-logistica'

export const TOUR_PORTADA: PasoTour[] = [
  {
    titulo: 'Bienvenido al Tablero Operativo',
    cuerpo:
      'Aquí se concentran los indicadores de operación de Grupo Shuma. Los datos salen directo del sistema administrativo, sin captura manual de por medio. Este recorrido toma menos de un minuto y explica cómo leerlos.',
  },
  {
    ancla: 'panel-logistica',
    titulo: 'El tiempo típico, no el promedio',
    cuerpo: `Este número es la mediana: el caso típico. Se usa en lugar del promedio porque un puñado de entregas muy lentas lo distorsiona hacia arriba y da la impresión de que la operación incumple cuando no es así. Cada empresa tiene su propia meta de días acordada con la dirección.`,
  },
  {
    ancla: 'etapa-lenta',
    titulo: 'Dónde se va el tiempo',
    cuerpo:
      'Más de la mitad del tiempo de entrega es material ya surtido esperando camión. No es un problema de almacén ni de choferes: es de programación de rutas. Es la mayor oportunidad de mejora que muestra el tablero.',
  },
  {
    ancla: 'areas-pendientes',
    titulo: 'Las áreas que faltan',
    cuerpo:
      'Cada área se integra cuando sus indicadores quedan definidos con su responsable. Las tarjetas sin cifras todavía no tienen datos conectados: aparecen vacías a propósito, para no mostrar números que nadie ha validado.',
  },
]

export const getTourLogistica = (empresa: Empresa): PasoTour[] => {
  const pasos = [
    {
      ancla: 'kpis',
      titulo: 'Mediana y promedio dicen cosas distintas',
      cuerpo:
        'La mediana describe el caso típico; el promedio se mueve con los casos extremos. Que los dos se separen mucho no quiere decir que la operación empeoró: quiere decir que hubo un grupo pequeño de entregas muy lentas arrastrando el promedio.',
    },
    {
      ancla: 'etapas',
      titulo: 'El ciclo, etapa por etapa',
      cuerpo:
        'Aquí se ve en qué parte del proceso se consume el tiempo. La etapa de surtido aparece casi siempre en cero: no es un error del tablero, es que el sistema registra la recepción y el surtido en el mismo momento, así que no hay nada que medir entre ambos.',
    },
    {
      ancla: 'tendencia',
      titulo: 'El mes en curso va incompleto',
      cuerpo:
        'Los datos cierran al día anterior, así que el último mes de la gráfica lleva solo unos días de operación y se marca como incompleto. Su caída de volumen es esperada: no indica que la operación se haya detenido.',
    }
  ]

  // Los dos pasos solo diferian en los ejes de filtrado. Tenerlos duplicados
  // obligaba a corregir cualquier ajuste de redaccion en dos lugares.
  const ejes = empresa.usaZonas ? 'zona, año y mes' : 'año y mes'
  pasos.push({
    ancla: 'filtros',
    titulo: 'Filtra y comparte la vista',
    cuerpo: `Puedes acotar por ${ejes}. El filtro se guarda en la dirección del navegador: si copias el enlace y lo mandas, quien lo abra ve exactamente lo mismo que tú.`,
  })

  return pasos
}


/**
 * Recorrido del nivel de empresa.
 *
 * Aqui si se puede citar la meta con su numero: ya hay una sola empresa en
 * contexto. En la portada no, porque cada empresa tiene la suya y un solo
 * numero seria falso para la otra.
 */
export const getTourEmpresa = (empresa: Empresa): PasoTour[] => {
  const pasos: PasoTour[] = [
    {
      titulo: `Indicadores de ${empresa.nombreCorto}`,
      cuerpo:
        'Aquí están las áreas de la empresa. Las cifras vienen directo del sistema administrativo: nadie las captura a mano. El recorrido toma menos de un minuto.',
    },
    {
      ancla: 'panel-logistica',
      titulo: 'El tiempo típico, no el promedio',
      cuerpo: `Este número es la mediana, o sea el caso típico. No es el promedio: unas cuantas entregas muy lentas lo jalan hacia arriba y harían ver a la operación fuera de meta sin estarlo. La meta de ${empresa.nombreCorto} es de ${empresa.metaDias} días.`,
    },
    {
      ancla: 'areas-pendientes',
      titulo: 'Las áreas que faltan',
      cuerpo:
        'Cada área entra al tablero cuando su responsable define qué se va a medir. Las tarjetas sin cifras están vacías a propósito: preferimos un espacio en blanco antes que un número que nadie ha validado.',
    },
  ]
  return pasos
}
