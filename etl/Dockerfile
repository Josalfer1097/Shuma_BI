FROM python:3.12-slim-bookworm

# Zona horaria de Mexico City -- importante para que "de madrugada"
# sea realmente madrugada en CDMX, no en UTC.
ENV TZ=America/Mexico_City
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ============================================================
# LA BASE VA FIJA A BOOKWORM, A PROPOSITO
#
# python:3.12-slim a secas sigue a la ultima estable de Debian.
# Cuando trixie (Debian 13) se volvio estable, libaio1 paso a
# llamarse libaio1t64 y esta build dejo de compilar de un dia
# para otro, sin que nadie tocara nada.
#
# Peor: el paquete nuevo entrega libaio.so.1t64, pero los
# binarios de Oracle piden libaio.so.1. Habria que mantener un
# enlace simbolico persiguiendo cambios de distribucion.
#
# En bookworm el paquete se llama libaio1 y entrega libaio.so.1
# directo. La imagen queda reproducible.
# ============================================================

# ============================================================
# ORACLE INSTANT CLIENT 19c -- MULTIARQUITECTURA
#
# SGE_CFS_PROD corre sobre Oracle 11.2. El modo "thin" de
# python-oracledb solo soporta 12.1 o superior, asi que hay que usar
# el modo "thick", que necesita estas librerias.
#
# Version 19c y no una mas nueva: 21c y 23ai ya no permiten conectarse
# a bases 11.2.
#
# Por que dos URLs: Oracle NUNCA publico Instant Client 19c para
# Apple Silicon. El de macOS ARM64 empieza en la rama 23, que no
# alcanza a 11.2. La salida es Linux ARM64 dentro de un contenedor,
# que si tiene 19c y corre nativo en un M1.
#
# TARGETARCH lo llena Docker solo: "arm64" en Mac Apple Silicon,
# "amd64" en la Windows y en cualquier servidor Intel. La misma
# imagen sirve en las dos maquinas.
# ============================================================
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
        cron unzip curl libaio1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/oracle \
    && if [ "$TARGETARCH" = "arm64" ]; then \
         IC_URL="https://download.oracle.com/otn_software/linux/instantclient/1919000/instantclient-basic-linux.arm64-19.19.0.0.0dbru.zip"; \
         IC_DIR="instantclient_19_19"; \
       else \
         IC_URL="https://download.oracle.com/otn_software/linux/instantclient/1928/instantclient-basiclite-linux.x64-19.28.0.0.0dbru.zip"; \
         IC_DIR="instantclient_19_28"; \
       fi \
    && curl -fLo /tmp/ic.zip "$IC_URL" \
    && unzip -q /tmp/ic.zip -d /opt/oracle \
    && rm /tmp/ic.zip \
    && ln -s /opt/oracle/$IC_DIR /opt/oracle/instantclient \
    && echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle.conf \
    && ldconfig

# El enlace simbolico deja una sola ruta valida en las dos
# arquitecturas, aunque la carpeta real cambie de nombre.
ENV ORACLE_CLIENT_DIR=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Los DOS ETL. El original solo copiaba etl.py, asi que el de
# ventas nunca entro al contenedor.
COPY etl.py .
COPY etl_ventas.py .

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
