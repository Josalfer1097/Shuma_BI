# Changelog

## [0.32.3] — 2026-08-22

### Corregido
- El embudo etiquetaba como "Facturado" el campo `imp_cot_convertido`, que es otra cifra que la tarjeta "Facturado" de KpiRow. Ahora dice "Cotizado que se facturó".
- `package.json` había quedado en 0.32.1 con el CHANGELOG en 0.32.2.

### Añadido
- Tramos "Suspendida a mano" y "Cancelado" en el embudo: los cinco tramos ahora suman el cotizado y desaparecen las notas que explicaban el hueco.
- Aviso de descuadre en el embudo con tolerancia del 0.1%. Si aparece, hay un estado nuevo en el ERP.
- `TooltipDato`: tooltip de dato al pasar el cursor, en portal para que no lo recorte el `overflow-hidden` de las barras.
- Tooltips de explicación y de dato en embudo, concentración, vendedores, ranking y hallazgos.

### Cambiado
- `PanelConcentracion` deja de usar el `title=` nativo del navegador.

## [0.32.1] — 2026-08-22

### Añadido
- `Area.empresas`: habilitación de área por empresa. Un área activa sin datos para una empresa se degrada a "pendiente" en su portada en vez de mostrar un tablero de ceros.
- Estado explícito en `/[empresa]/ventas` cuando el área no tiene datos para esa empresa.

### Cambiado
- `AREAS_PENDIENTES` y `AREAS_ACTIVAS_SIN_PANEL` pasan de constantes a las funciones `areasPendientes(empresaId)` y `areasActivasSinPanel(empresaId)`.

## v0.31.2 — 2026-08-26

- **Mejoras**: Última compra desde el periodo completo, esqueletos con barrido, animación de login a tamaño legible y detección de captura errónea en la partida mayor.

## v0.31.1 — 2026-08-26

- **UI/UX**: Implementada animación nativa de login y esqueletos de carga (Skeletons) para mejorar la transición de datos.
- **Ventas**: Nuevo indicador de "Clientes dormidos" bajo los KPIs y detalle extendido para la partida más grande.
- **Filtros**: Agregada transición visual al aplicar filtros, congelando opacidad mientras cargan los datos.
## v0.31.0 — 2026-08-26

- **Ventas**: Reestructuración de KPIs principales para reportar en pesos (En la mesa, Abandonado, Suspendido, Cancelado) y nueva visualización destacada para métricas de abandono accionables.

## v0.30.4 — 2026-08-26

- **Ventas**: Comparativo anual corregido, lenguaje de negocio en los indicadores, aviso de mes incompleto y recorrido guiado de ventas.

## v0.30.3 — 2026-08-26

- Caché de 15 minutos en página de Ventas para optimizar velocidad.
- Consultas a Supabase optimizadas con columnas explícitas en lugar de `select('*')`.
- Al entrar sin parámetros, se selecciona por default el último mes con datos.
- Rediseño completo de la barra de filtros (layout tipo grid, altura adaptada, estilos unificados).

## v0.30.2 — 2026-08-25

- **Ventas**: Detalle del mes ahora filtra por dimensión desde la consulta, reduciendo datos innecesarios.
- **Ventas**: Tabla de ranking inicializa colapsada, paginada a 25 filas, e incorpora buscador en memoria.
- **Ventas**: Filtro por entidad (cliente/vendedor) disponible con listado de opciones, auto-completado y recálculo de KPI en tiempo real.
- **Logística**: Tabla de detalle inicializa colapsada bajo el mismo componente disclosure.

## v0.30.1 — 2026-08-25

- **Ventas**: Carga por dimensión en el ranking de ventas para optimizar rendimiento.
- **Ventas**: Nuevo panel de ventas en la portada con métricas del mes más reciente.

## v0.30.0 — 2026-08-21

- Implementación del módulo de Ventas, calcando el comportamiento, estructura y estilos visuales de Logística.
- Se crean componentes dedicados (Dashboard, KpiRow, FilterBar, TrendChart, RankingTable, PanelHallazgos, Glossary) que consumen directamente las funciones de agregación.
- Integración de vistas pre-agregadas `v_ventas_mensual` y `v_ventas_ranking` para mejorar rendimiento.
- Incorporación de paginación para conjuntos de datos con más de 1,000 filas de PostgREST usando `.range()`.

## v0.26.1 — 2026-08-13

- El tablero ya tiene icono propio en la pestana del navegador. Antes salia
  el icono generico y el navegador registraba un error al no encontrarlo.
- Se limpian las advertencias de la consola del navegador. Aparecian decenas
  por sesion al navegar entre pantallas y tapaban los mensajes que si
  importan. No afectaban al funcionamiento.

## v0.26.0 — 2026-08-12

- El color de cada empresa ahora se ve dentro de sus tableros: filo superior,
  ambiente de fondo y encabezados de indicadores. Ya se distingue de un
  vistazo en que empresa se esta sin leer el titulo.
- Los colores de las graficas NO cambian con la empresa: siguen siendo los
  mismos para que una etapa lenta nunca se confunda con un error.
- La grafica de tendencia mensual gana relleno degradado bajo la linea y una
  rejilla mas tenue.

## v0.25.0 — 2026-08-12

- Cada empresa tiene ahora su color propio: azul marino para Comercializadora
  y rojo escarlata para Acabados. Antes las dos usaban practicamente el mismo
  azul del sistema y no se distinguian.
- La pantalla de acceso se rehizo con superficie de vidrio, profundidad y los
  dos colores del grupo. Sigue sin mostrar ninguna cifra.
- Las tarjetas de la pantalla de inicio se tinen con el color de su empresa.

## v0.24.0 — 2026-08-11

- Ahora hay que iniciar sesion para entrar al tablero. Antes cualquiera con la
  direccion podia ver los indicadores.
- La pantalla de acceso se rediseno con fondo animado, marcos de esquina y
  transiciones. El fondo es geometria abstracta: no muestra ninguna cifra.
- La pantalla de inicio solo muestra las empresas asignadas a cada persona.
- Quien entra a un area que no le corresponde ve una pantalla que se lo
  explica, en vez de una pagina vacia.

## v0.23.0 — 2026-08-11

- Se agrega la pantalla de acceso. Se puede entrar con un enlace enviado al
  correo o con contrasena, a eleccion de cada persona.
- El encabezado muestra quien inicio sesion y permite salir.
- Por ahora el tablero sigue abierto para todos: esta entrega solo habilita
  el acceso, todavia no restringe nada.

## v0.22.2 — 2026-08-09

- Se corrige el globo del recorrido guiado, que se colocaba encima del
  elemento que estaba explicando cuando ese elemento ocupaba buena parte de la
  pantalla. Ahora busca hueco abajo, arriba y a los lados, y si no lo hay se
  recarga contra el borde para dejar visible lo que senala.
- El globo tambien se reacomoda al cambiar el tamano de texto desde su propio
  boton. Antes conservaba la posicion calculada con el tamano anterior.
- Se corrigen los acentos y la enes faltantes en los textos del recorrido de
  empresa, y se redactan de nuevo para que se lean mas naturales.

## v0.22.1 — 2026-08-07

- Las tarjetas de la pagina de inicio ahora muestran la plaza de cada empresa,
  Ciudad de Mexico y Puebla, en lugar de un detalle de reparto. La tarjeta
  representa a la empresa completa, y ese dato pertenecia solo a logistica.
- Se retira la linea de descripcion de las tarjetas. Las empresas del grupo
  comparten giro y se distinguen por razon social y plaza, asi que cualquier
  texto ahi repetia el nombre.

## v0.22.0 — 2026-08-07

- Se incorpora Neuropol, la tipografia de identidad del grupo, para los
  rotulos de las empresas en la pagina de inicio.
- Se rehace la pagina de inicio con un tratamiento visual propio: marcos de
  esquina, reticula tecnica y el color de cada empresa como elemento
  principal. Las pantallas de indicadores se mantienen sobrias a proposito,
  para no restarle legibilidad a las cifras.

## v0.21.2 — 2026-08-07

- Se corrige la grafica de tendencia mensual, que dejaba de dibujarse en las
  empresas que no manejan zonas de reparto. El area del grafico se quedaba sin
  altura al ocupar la fila completa.
- Los filtros de ano y mes ahora se pueden quitar por separado. Antes se
  mostraban juntos en una sola etiqueta, asi que para cambiar de mes habia que
  quitar tambien el ano y volver a elegirlo.
- Se rehacen las tarjetas de la pagina de inicio: las siglas de cada empresa
  ahora aparecen caladas sobre el bloque de color, con acabado de vidrio y un
  reflejo que recorre la tarjeta al pasar el cursor.

## v0.21.1 — 2026-08-07

- Se rehacen las tarjetas de la pagina de inicio con las siglas reales de cada
  empresa, CFS y ASH, sobre un bloque de color solido. Antes mostraban las dos
  primeras letras del nombre, que no significaban nada.
- Los tiempos de mas de dos dias tambien muestran su equivalencia. Un valor
  como 3.2 dias ahora aclara que son 3 dias con 5 horas.

## v0.21.0 — 2026-08-07

- Los tiempos por etapa ahora muestran su equivalencia en horas. Un valor
  como 1.2 dias se leia como "un dia y algo" cuando en realidad son casi 29
  horas, y eso hacia parecer menor un problema que no lo es.
- Se agrega el panel "Que esta pasando", junto a los filtros. Reune en un solo
  lugar que cambio contra el mes anterior y contra el mismo mes del ano
  pasado, que se sale de lo normal en el periodo, y que conviene saber al leer
  las cifras.
- El panel respeta los filtros aplicados: si se esta viendo una zona, habla de
  esa zona. Solo presenta hechos calculados sobre los mismos datos que estan
  en pantalla, no recomendaciones de operacion.

## v0.20.3 — 2026-08-07

- Las tarjetas de la pagina de inicio dejan de mostrar informacion de
  logistica. Cada tarjeta representa a la empresa completa, y cuando entren
  las demas areas un dato de logistica estaria hablando por todas.
- Se redisenan las tarjetas para que la identidad de cada empresa sea lo
  unico que comuniquen: color, monograma y nombre.

## v0.20.2 — 2026-08-06

- Las tarjetas de la pagina de inicio dejan de mostrar cifras. Un tiempo de
  entrega sin su meta y su volumen al lado no dice nada a quien apenas entra,
  y esos datos ya aparecen completos al abrir cada empresa.
- En su lugar cada tarjeta muestra si la empresa esta dentro de meta, fuera de
  meta o sin datos cargados, con un indicador de color acompanado de su texto.

## v0.20.1 — 2026-08-06

- Se redisenan las tarjetas de empresa de la pagina de inicio. Ahora el color
  de cada empresa es el elemento principal y se distingue de un vistazo cual
  es cual antes de leer el nombre.
- Se quita el selector de empresa de la pagina de inicio: la pagina completa
  ya cumple esa funcion.
- Se corrige el color distintivo de Acabados, que aparecia en morado en lugar
  de rojo.

## v0.20.0 — 2026-08-06

- La pagina de inicio ahora sirve para elegir empresa. Muestra a cada una con
  su color, su tiempo tipico de entrega y su meta, sin mezclar cifras entre
  ellas.
- Al entrar a una empresa se abre su pantalla de areas, con logistica al
  frente y las demas areas pendientes de integrar. Antes todo competia en una
  sola pantalla.
- Se corrige que el detalle de una empresa sin datos cargados mostrara un
  error de conexion en lugar de indicar que aun no tiene informacion.
- El boton de reintentar y el enlace de regreso ahora respetan la empresa en
  la que se esta navegando.

## v0.19.0 — 2026-08-06

- Arquitectura multiempresa: se separa la operación de Comercializadora (CFS) y Acabados.
- Enrutamiento dinámico `/[empresa]/logistica`.
- Inyección de contexto de empresa (`EmpresaProvider`) para parametrizar metas y comportamientos de interfaz.
- Ajuste de filtros, recorridos guiados y gráficas condicionales según si la empresa usa distribución por zonas.

## v0.18.4 — 2026-08-06

- Se corrige definitivamente el hueco en la barra de etapas. Las etapas mas
  cortas se dibujaban con su ancho correcto pero sin altura, asi que no se
  veian. La barra ahora se completa de extremo a extremo.

## v0.18.3 — 2026-08-06

- Se corrigen los tramos que no se dibujaban en la barra de etapas y dejaban
  huecos. Las etapas mas cortas, las que no alcanzan a mostrar su porcentaje
  encima, quedaban sin altura y desaparecian de la barra.
- Se corrige el color de las etapas cuando alguna no tiene tiempo registrado
  en el periodo consultado: los colores se recorrian y dejaban de coincidir
  con los de la lista de abajo.

## v0.18.2 — 2026-08-06

- Se corrige de raiz la grafica de evolucion por etapa, que seguia sin
  dibujarse. El area del grafico se quedaba sin altura por un conflicto entre
  dos reglas de acomodo.
- Se rehacen los colores de las etapas del proceso. Antes iban de un tono muy
  oscuro a uno casi blanco, y los ultimos tramos de la barra se veian como
  espacios vacios. Ahora los seis tienen la misma intensidad y se distinguen
  por color, no por claridad.
- Al pasar el cursor o tocar un tramo de la barra de etapas se muestra su
  detalle: tiempo mediano, porcentaje del ciclo y si es la etapa mas lenta.

## v0.18.1 — 2026-08-06

- Se corrige la grafica de evolucion por etapa, que aparecia vacia. El area de
  dibujo se quedaba sin altura por un cambio hecho al agregar el control de
  tamano de texto.
- Se corrigen los colores de las etapas del proceso. Los tonos mas claros
  desaparecian sobre fondo blanco en modo claro, y el porcentaje escrito sobre
  la etapa mas lenta era ilegible. Ahora los seis tonos y sus textos tienen
  contraste suficiente en modo claro y en modo oscuro.

## v0.18.0 — 2026-08-06

- La actualizacion automatica ahora puede alimentar el tablero con la
  informacion de varias empresas del grupo, cada una con su propia conexion y
  su propio horario. Si una falla, las demas siguen actualizando.
- Se dejan fuera del calculo las cotizaciones que tardaron mas de un mes en
  salir a ruta. Ese tiempo es de decision del cliente y no de la operacion, y
  distorsionaba los promedios: en algunos meses los multiplicaba por seis.
- El tablero ahora guarda cuantos registros se dejaron fuera por ese motivo,
  para poder explicar en cualquier momento como se llego a cada cifra.

## v0.17.1 — 2026-08-06

- Se corrige que al aplicar un filtro el tablero regresaba a la pagina de
  inicio en lugar de quedarse en el detalle de logistica. Pasaba lo mismo al
  hacer clic en una zona del ranking o en un mes de la grafica de tendencia.
- Se corrige la grafica de tendencia mensual, que podia quedarse sin dibujar
  por un cambio de acomodo introducido con el recorrido guiado.
- Se corrige la posicion del recorrido guiado en telefono: cuando el elemento
  resaltado era mas alto que la pantalla, el mensaje quedaba fuera de la
  vista.

## v0.17.0 — 2026-08-06

- Se agrega un recorrido de bienvenida que explica como leer el tablero. Se
  muestra la primera vez que alguien entra y se puede volver a ver cuando se
  quiera, con el boton de ayuda del encabezado.
- El recorrido aclara los puntos que mas se prestan a confusion: por que se
  usa el tiempo tipico y no el promedio, por que el mes en curso aparece
  incompleto y por que una de las etapas del proceso siempre sale en cero.
- Hay un recorrido distinto para la pagina de inicio y otro para el detalle
  de logistica.

## v0.16.0 — 2026-08-06

- Se agrega una pagina de inicio que reune las areas de la empresa en un solo
  lugar, con los indicadores principales de logistica a la vista.
- El tablero de tiempos de entrega pasa a ser el modulo de logistica y ahora
  vive en su propia seccion, con la misma informacion de siempre.
- Se dejan preparadas las secciones de las demas areas, marcadas como
  pendientes hasta que se integren sus datos.

## v0.15.0 — 2026-08-05

- Se agrega un control para aumentar el tamaño del texto de todo el tablero,
  con cuatro tamanos disponibles. Al elegir uno se muestra una vista previa
  antes de aplicarlo, para poder comparar sin cambiar la pantalla completa.
- El tamano elegido se recuerda para la proxima visita y no se reinicia al
  cambiar entre modo claro y oscuro.
- El texto de las graficas tambien crece junto con el resto del tablero, para
  que la informacion sea legible en presentaciones y en pantallas grandes.

## v0.14.0 — 2026-08-03

- El indicador de estado ahora avisa en rojo cuando la actualizacion
  automatica falla. Antes se mostraba en verde aunque no hubiera datos
  nuevos, lo que daba una falsa sensacion de que todo estaba al dia.
- Se muestra hasta que dia llegan los datos, para saber con claridad que
  periodo se esta viendo.
- El mes en curso se identifica como incompleto en las graficas y en la
  tabla. Al llevar solo unos dias de operacion se veia como una caida
  fuerte, cuando en realidad el mes apenas va empezando.
- Se revisa el tablero completo en telefono, tableta y computadora para
  confirmar que toda la informacion se lee bien en cualquier pantalla.

## v0.13.0 — 2026-08-03

- Se documenta internamente el proceso de actualizacion automatica, para que
  cualquier persona del area pueda darle mantenimiento sin depender de quien
  lo escribio.
- Se agrega un mensaje claro cuando la conexion se intenta con una cuenta
  administrativa en lugar de la cuenta propia del proceso. Era la causa mas
  comun de falla al configurarlo por primera vez.

## v0.12.0 — 2026-08-03

- Se corrige la conexion automatica con el sistema administrativo. La
  actualizacion nocturna no lograba conectarse porque el metodo de conexion
  no era compatible con la version de base de datos que usa la empresa.
- Se incorpora al proceso automatico el componente de conexion que Oracle
  requiere, tanto en el servidor donde corre la tarea nocturna como en los
  equipos de trabajo.
- Se documenta la instalacion de ese componente, para poder levantar el
  proceso desde cero sin depender de quien lo configuro la primera vez.

## v0.11.0 — 2026-08-03

- Se incorpora la meta de cinco dias comprometida con el cliente. El tablero
  ahora indica si se esta cumpliendo, no solo cuanto se tarda.
- Se agrega un indicador de cumplimiento de meta y se marcan en rojo las
  zonas que estan fuera del compromiso.
- Se puede elegir contra que comparar el mes seleccionado: el mes anterior,
  el mismo mes del año pasado o el promedio del periodo.
- La grafica de tendencia muestra la linea de meta y el promedio del periodo,
  para ubicar cada mes respecto a ambos.
- Se marcan automaticamente los meses donde el promedio se dispara por casos
  aislados, aclarando que el proceso general no empeoro.
- Se agrega la grafica de evolucion por etapa, que permite ver en cual parte
  del proceso se dio una mejora o un retroceso.
## v0.10.0 — 2026-08-03

- Se corrige el boton de ayuda de los indicadores, que no mostraba nada al
  presionarlo porque el texto quedaba oculto detras de la tarjeta.
- Al consultar un mes especifico ya no se pierde la grafica: ahora se
  muestran los ultimos doce meses con el mes elegido resaltado, para poder
  ubicarlo en su contexto.
- Se agrega la comparacion contra el mes anterior en tiempo de entrega,
  volumen y etapa mas lenta, indicando si mejoro o empeoro.

## v0.9.0 — 2026-08-03

- Cada grafica ahora indica que pregunta responde y cuenta con un boton de
  ayuda que explica como leerla y que buscar en ella.
- Se agregan leyendas y etiquetas de eje. En la grafica de tendencia ya se
  distingue cual linea es la mediana y cual el promedio.
- El ranking por zona muestra el numero de dias al final de cada barra.
- Se corrige el indicador de dias entre entrega y facturacion, que mostraba
  un valor negativo por el efecto de unos pocos registros atipicos. Ahora se
  calcula de una forma que no se distorsiona por esos casos.
- Se aclara por que la etapa de surtido aparece en cero: el sistema registra
  la recepcion y el surtido en el mismo momento.

## v0.8.0 — 2026-08-01

- Se reordena el tablero para que al abrirlo se vean primero los numeros
  principales y las graficas, sin necesidad de desplazarse.
- Los indicadores se muestran de forma compacta. Sus explicaciones se mueven
  a una seccion desplegable mas abajo, junto al glosario.
- El desglose por tipo de autorizacion se mueve debajo de las graficas, por
  ser informacion de apoyo.
- Se mejora el mensaje que aparece cuando aun no hay informacion cargada,
  para distinguirlo de un valor en cero.

## v0.7.0 — 2026-08-01

- Se agrega el desglose del tiempo de entrega por etapa del proceso, para ver
  en cual se va el tiempo. La etapa mas lenta se resalta automaticamente.
- Se agrega el indicador de autorizacion, que antes no se media y resulto ser
  la etapa mas lenta: se lleva alrededor de una quinta parte del tiempo total.
- Se agrega el desglose de que tipo de autorizacion se solicita, para
  identificar cual es la que mas frena la operacion.
- Se retira el indicador de facturas fuera de rango. Al revisarlo contra la
  operacion real se confirmo que la facturacion por lote al cierre del dia es
  la practica normal, por lo que el indicador marcaba como problema algo que
  no lo es.
- Se agrega el indicador de dias entre la entrega y la facturacion, que si
  refleja un tiempo accionable porque de el depende el arranque de la
  cobranza.

## v0.6.0 — 2026-08-01

- Se agrega modo claro, con un boton en la parte superior para alternar entre
  claro y oscuro. La preferencia se recuerda para la proxima visita.
- Se aumenta el contraste de los textos en ambos modos. Las descripciones de
  los indicadores y las notas del glosario estaban por debajo del nivel
  recomendado de legibilidad y ahora cumplen el estandar.
- Se ajustan los bordes y las lineas de las graficas para que se distingan
  correctamente en los dos modos.

## v0.5.0 — 2026-07-31

- Se agrega el proceso automatico que trae la informacion de tiempos de
  entrega desde el sistema Oracle hacia la base del tablero, todas las
  madrugadas.
- Se agregan los scripts de preparacion de la base de datos y la consulta
  que genera los indicadores.
- El proceso trabaja siempre con informacion cerrada hasta el dia anterior,
  para que las cifras no cambien durante el dia.

## v0.4.0 — 2026-07-31

- Se amplia el tablero de cuatro a seis indicadores principales, agregando
  las cotizaciones ligadas a factura y las facturas fuera del orden esperado.
- La explicacion de cada indicador ahora se lee siempre debajo del numero, sin
  necesidad de pasar el puntero ni tocar la pantalla. Asi se entiende el
  tablero al verlo proyectado o en una captura.
- El indicador de facturas fuera de rango cambia de color segun que tan alto
  sea, para identificar de inmediato si hay un problema de proceso.
- Se agrega una seccion de glosario al final, que explica en lenguaje sencillo
  cada uno de los datos del tablero.

## v0.3.0 — 2026-07-31

- Se adapta el tablero para consultarse desde telefono.
- Las explicaciones de cada indicador ahora se abren con un toque. Antes solo
  funcionaban con el puntero de una computadora, por lo que no se podian leer
  desde el celular.
- Los filtros se agrupan en un boton que despliega las opciones, y muestra
  que filtros estan aplicados.
- La tabla de detalle se muestra como tarjetas en pantallas pequeñas para
  poder leerla sin desplazarse a los lados.
- Se ajustan las graficas para que las etiquetas sean legibles en pantallas
  angostas.

## v0.2.0 — 2026-07-31

- Se cambia el filtro de rango de meses por dos selectores separados de año y
  de mes, para poder consultar periodos concretos.
- El selector de mes solo muestra los meses que tienen informacion en el año
  elegido.
- Se agrega una etiqueta que indica que periodo se esta viendo en pantalla.
- Cuando se consulta un solo mes, la grafica de tendencia se reemplaza por un
  resumen de ese periodo.

## v0.1.0 — 2026-07-31

Primera version del tablero de tiempos de entrega.

- Se agrega el tablero con los indicadores principales de la operacion
  logistica: entregas totales, tiempo tipico de entrega, caso mas lento y
  facturas fuera del orden esperado.
- Se agregan filtros por zona y por rango de meses. Los filtros quedan en la
  direccion del navegador para poder compartir la vista tal cual se ve.
- Se agrega la grafica de tendencia mensual y el ranking de zonas por tiempo
  de entrega.
- Se agrega la tabla de detalle con ordenamiento y paginacion.
- Se agrega el indicador de ultima actualizacion de los datos.
