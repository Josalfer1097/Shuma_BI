FROM python:3.12-slim

# Zona horaria de Mexico City -- importante para que "de madrugada"
# sea realmente madrugada en CDMX, no en UTC.
ENV TZ=America/Mexico_City
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ============================================================
# ORACLE INSTANT CLIENT 19c
#
# SGE_CFS_PROD corre sobre Oracle 11.2. El modo "thin" de
# python-oracledb solo soporta 12.1 o superior, asi que hay que usar
# el modo "thick", que necesita estas librerias.
#
# Version 19c y no una mas nueva: 21c y 23ai ya no permiten conectarse
# a bases 11.2.
# ============================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
        cron unzip curl libaio1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/oracle \
    && curl -Lo /tmp/ic.zip \
       https://download.oracle.com/otn_software/linux/instantclient/1928/instantclient-basiclite-linux.x64-19.28.0.0.0dbru.zip \
    && unzip -q /tmp/ic.zip -d /opt/oracle \
    && rm /tmp/ic.zip \
    && echo /opt/oracle/instantclient_19_28 > /etc/ld.so.conf.d/oracle.conf \
    && ldconfig

ENV ORACLE_CLIENT_DIR=/opt/oracle/instantclient_19_28
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_19_28

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY etl.py .
COPY crontab.txt /etc/cron.d/etl-cron

RUN chmod 0644 /etc/cron.d/etl-cron \
    && crontab /etc/cron.d/etl-cron \
    && touch /var/log/etl.log

# El .env se monta como volumen en runtime (ver docker-compose.yml).
# etl.py lo lee explicitamente via python-dotenv al arrancar, porque
# cron NO hereda las variables de entorno del contenedor.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
