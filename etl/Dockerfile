FROM python:3.12-slim

# Zona horaria de Mexico City -- importante para que "de madrugada"
# sea realmente madrugada en CDMX, no en UTC.
ENV TZ=America/Mexico_City
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get install -y --no-install-recommends cron \
    && rm -rf /var/lib/apt/lists/*

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
