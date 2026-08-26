#!/bin/sh
set -e

# ============================================================
# EL CHOQUE DE ORACLE_CLIENT_DIR
#
# etl.py hace load_dotenv(..., override=True), asi que el .env
# le GANA a las variables del contenedor. Y el .env de la casa
# trae la ruta de Windows:
#
#     ORACLE_CLIENT_DIR=C:\oracle\instantclient_19_31
#
# Esa carpeta no existe aqui adentro, asi que el contenedor
# fallaria con el .env tal cual.
#
# En vez de mantener dos .env con las mismas credenciales -- que
# es como se terminan filtrando -- montamos el real como
# .env.host en solo lectura y generamos el de adentro cambiando
# nada mas esa linea. Una sola fuente de verdad.
# ============================================================
if [ ! -f /app/.env.host ]; then
    echo "[entrypoint] ERROR: no se monto /app/.env.host."
    echo "[entrypoint] Revisa el volumen en docker-compose.yml."
    exit 1
fi

sed 's|^ORACLE_CLIENT_DIR=.*|ORACLE_CLIENT_DIR=/opt/oracle/instantclient|' \
    /app/.env.host > /app/.env

# Si el .env no traia la linea, la agregamos.
grep -q '^ORACLE_CLIENT_DIR=' /app/.env \
    || echo 'ORACLE_CLIENT_DIR=/opt/oracle/instantclient' >> /app/.env

echo "[entrypoint] Instant Client: $(readlink -f /opt/oracle/instantclient)"
echo "[entrypoint] Arquitectura:   $(uname -m)"
echo "[entrypoint] Cron programado (America/Mexico_City):"
echo "[entrypoint]   05:00 logistica cfs   |  05:15 logistica acabados"
echo "[entrypoint]   05:30 ventas cfs      |  05:45 ventas acabados"

echo "[entrypoint] Corriendo una vez ahora mismo para validar que todo funciona..."
cd /app && python /app/etl.py --empresa cfs 2>&1 | tee -a /var/log/etl.log

echo "[entrypoint] Arrancando cron en primer plano..."
cron -f &
tail -f /var/log/etl.log
