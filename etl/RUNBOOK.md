# RUNBOOK — Mantenimiento del ETL

Este documento describe los procedimientos operativos para mantener y diagnosticar el script ETL, particularmente ahora que opera en un modelo multiempresa.

## Agregar una nueva empresa

El script esta disenado para soportar multiples empresas sin duplicar codigo. Para agregar una nueva empresa (ej. `miempresa`):

1. **Variables de Entorno**: Agrega `miempresa` a la lista de `ETL_EMPRESAS` en el `.env`.
   ```env
   ETL_EMPRESAS=cfs,acabados,miempresa
   ```
2. **Credenciales**: Define las variables de conexion usando el identificador en MAYUSCULAS como prefijo.
   ```env
   ORACLE_MIEMPRESA_USER=ETL_DASHBOARD
   ORACLE_MIEMPRESA_PASSWORD=...
   ORACLE_MIEMPRESA_DSN=...
   ```
3. **Tarea Programada**: Agrega una nueva linea en `etl/crontab.txt`, separando la ejecucion por 10-15 minutos de las demas empresas para evitar saturacion de red o base de datos.
   ```cron
   30 5 * * * cd /app && /usr/local/bin/python /app/etl.py --empresa miempresa >> /var/log/etl.log 2>&1
   ```
4. **Reconstruir**: Ejecuta `docker compose up -d --build` para aplicar la nueva configuracion del crontab.

**No es necesario modificar codigo Python ni SQL.**

## Filtro de Dormancia

El ETL incluye un filtro de "dormancia" (`ETL_DIAS_DORMANCIA`, por defecto 30 dias). 

**¿Que significa?**
Se excluyen del calculo operativo todas aquellas cotizaciones que tardaron mas de 30 dias entre la fecha de creacion de la cotizacion y la fecha de salida a ruta. 

**¿Por que existe?**
El tiempo que un cliente demora en tomar una decision de compra no esta bajo el control de logistica. Incluir estos atipicos (ej. una cotizacion olvidada de 2023 que se surte en 2025) eleva artificialmente los promedios, destruyendo la comparabilidad contra la meta operativa (5 dias). La mediana se mantiene estable, probando que el filtro solo limpia el "ruido".

El numero de cotizaciones excluidas se cuenta y guarda en Supabase en la columna `excluidas_dormancia` para transparencia.

**Regla de Oro**: El umbral de dormancia (30 dias) debe ser el mismo para todas las empresas. Si cada empresa usara un filtro distinto, sus metricas en el tablero principal dejarian de ser comparables frente a frente.

## Troubleshooting (Solucion de Problemas)

Si una sola empresa falla mientras las demas corren bien, el problema suele estar en su conexion particular.

### Diagnostico Basico
Ejecuta el script en modo de comprobacion:
```bash
python etl.py --empresa acabados --check
```
El log deberia listar exactamente donde esta el error.

### Problemas comunes con "Acabados" u oficinas remotas (Puebla)
Si falla por `DPY-6005` o un Timeout, lo mas probable es una desconexion de red. 
- La instancia en Puebla (Acabados) se accede via VPN. Si la VPN se cae, el ETL no podra conectarse.
- **Solucion**: Revisa la conectividad a nivel de red (`ping` al host de Puebla). El ETL volvera a intentar en su proxima ejecucion programada una vez restaurada la VPN. Si urge, correlo de forma manual sin esperar a la madrugada.

### Fallos al borrar obsoletos (Paginacion)
El borrado de filas obsoletas (por ejemplo, cotizaciones canceladas retroactivamente) se hace paginado de 1,000 en 1,000. Si notas que filas viejas se quedan "congeladas", verifica que el usuario de servicio de Supabase tenga los privilegios correctos y que no haya errores de permisos en `DELETE`. El proceso esta acotado por empresa (`.eq("empresa", empresa)`) para no borrar datos de otras subsidiarias.

## Operacion del contenedor

El ETL corre dentro de Docker. La imagen es multiarquitectura: elige el Oracle Instant Client 19c segun el procesador, ARM64 en Apple Silicon y x86-64 en Windows o en un servidor Intel. Los mismos comandos sirven en cualquiera de las tres.

Todos los comandos de `docker compose` deben ejecutarse desde la carpeta `etl/`. Los de `docker exec` funcionan desde cualquier ruta porque identifican al contenedor por nombre.

### Encender

```bash
docker compose up -d
```

Al arrancar corre una vez el ETL de logistica de CFS para validar la conexion. En el log deben aparecer la ruta del Instant Client y la arquitectura detectada.

### Apagar

```bash
docker compose down
```

Elimina el contenedor y la red, pero conserva la imagen. Por eso volver a encender toma segundos y no los minutos de la primera construccion.

### Ejecutar los ETL manualmente

El contenedor debe estar encendido.

```bash
docker exec etl-shuma python /app/etl.py --empresa cfs
```

```bash
docker exec etl-shuma python /app/etl_ventas.py --empresa cfs
```

Sustituye `cfs` por el identificador de la empresa que corresponda.

### Verificar estado

```bash
docker ps
```

```bash
docker compose logs -f
```

`Ctrl+C` sale del log sin apagar el contenedor.

### Reconstruir la imagen

Necesario despues de modificar `Dockerfile`, `entrypoint.sh`, `crontab.txt` o cualquiera de los dos scripts de Python. Esos archivos se copian dentro de la imagen, asi que sin reconstruir se sigue ejecutando la version anterior.

```bash
docker compose up -d --build
```

## Ejecucion programada

El crontab dentro del contenedor esta configurado en zona horaria `America/Mexico_City`:

| Hora | Proceso |
|---|---|
| 05:00 | Logistica CFS |
| 05:15 | Logistica Acabados |
| 05:30 | Ventas CFS |
| 05:45 | Ventas Acabados |

Los horarios van escalonados de 15 minutos para no abrir varias sesiones simultaneas contra el SGE. El ETL de ventas devuelve mas de 100 mil filas y tarda cerca de dos minutos.

**Cron no recupera ejecuciones perdidas.** Si a las 5:00 la maquina esta apagada, suspendida, sin Docker corriendo o fuera de la red que alcanza al SGE, esa corrida simplemente no ocurre. No se ejecuta al reanudar.

De ahi que el contenedor solo deba considerarse automatizado en una maquina que cumpla las tres condiciones de forma permanente:

1. Encendida y sin suspender.
2. Con Docker en ejecucion.
3. Con acceso de red al host de Oracle.

En una laptop personal ninguna de las tres esta garantizada. Mientras el contenedor viva en un equipo asi, el ETL debe correrse manualmente con los comandos de la seccion anterior, y la maquina que tenga el cron activo se mantiene como respaldo.

Verificar la hora efectiva del contenedor:

```bash
docker exec etl-shuma date
```

Debe reportar `CST` o `CDT` segun la epoca del ano. Si muestra `UTC`, la zona horaria no se aplico y los horarios del crontab estarian desfasados.

## Troubleshooting del contenedor

### `no se monto /app/.env.host`

El `docker-compose.yml` monta el `.env` de la raiz del proyecto como `/app/.env.host` en solo lectura. El entrypoint genera a partir de el un `/app/.env` interno, cambiando unicamente `ORACLE_CLIENT_DIR`, porque la ruta del Instant Client del equipo anfitrion no existe dentro del contenedor. Asi las credenciales viven en un solo archivo.

Si el error aparece, la ruta del volumen no resuelve. Verifica:

```bash
grep env.host docker-compose.yml
```

Debe apuntar a `../.env`, es decir a la raiz del proyecto y no a `etl/`.

**Cuidado**: cuando un volumen apunta a una ruta inexistente, Docker crea un directorio vacio con ese nombre en lugar de fallar. Si aparece una carpeta `.env` dentro de `etl/`, es residuo de un intento anterior y hay que eliminarla antes de volver a levantar:

```bash
rmdir .env
```

`rmdir` solo elimina directorios vacios; si el `.env` fuera un archivo real, se niega.

### `Unable to locate package libaio1`

La imagen base esta fijada a `python:3.12-slim-bookworm` deliberadamente. La etiqueta `python:3.12-slim` sigue a la ultima version estable de Debian, y cuando Debian 13 (trixie) se volvio estable, `libaio1` paso a llamarse `libaio1t64` por la transicion de `time_t` a 64 bits. La construccion dejo de funcionar sin que nadie modificara nada.

Si este error reaparece, alguien quito el sufijo `-bookworm` de la primera linea del `Dockerfile`. Restaurarlo.

### La build falla al descargar el Instant Client

El `Dockerfile` fija versiones concretas: 19.19 para ARM64 y 19.28 para x86-64. Oracle retira paquetes antiguos de su servidor de descargas periodicamente.

Si el `curl` responde 404, obten el nombre exacto del archivo vigente en la pagina de descargas de Oracle Instant Client correspondiente a la plataforma y actualiza la URL y el nombre de carpeta en el `Dockerfile`.

**Debe permanecer en la rama 19c.** Las versiones 21c y 23ai ya no permiten conectarse a bases de datos Oracle 11.2, que es la version del SGE.

### El contenedor arranca con `no such file or directory`

Ocurre cuando `entrypoint.sh` quedo guardado con finales de linea CRLF. El interprete de la primera linea deja de reconocerse y el mensaje resultante no indica la causa real.

Convertir el archivo a finales de linea LF y reconstruir la imagen.