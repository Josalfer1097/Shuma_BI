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
