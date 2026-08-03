# Changelog

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
