# Changelog

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
