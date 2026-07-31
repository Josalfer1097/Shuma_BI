#!/bin/sh
set -e

echo "[entrypoint] Contenedor ETL iniciado. Cron programado para las 5:00 AM (America/Mexico_City)."
echo "[entrypoint] Corriendo una vez ahora mismo para validar que todo funciona..."
cd /app && python /app/etl.py 2>&1 | tee -a /var/log/etl.log

echo "[entrypoint] Arrancando cron en primer plano..."
cron -f &
tail -f /var/log/etl.log
