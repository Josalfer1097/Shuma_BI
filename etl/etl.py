"""
ETL: Tiempos de entrega Shuma -- Oracle (SGE_CFS_PROD) -> Supabase

Corre una vez al dia (madrugada) via cron. Recalcula TODO el rango
(no incremental) porque cotizaciones viejas pueden validarse tarde
y cambiar retroactivamente los promedios/medianas de meses pasados.

Requiere variables de entorno (ver .env.example):
    ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN
    SUPABASE_URL, SUPABASE_SERVICE_KEY
"""

import os
import sys
import time
import logging
from datetime import datetime, date, timezone

import oracledb
from supabase import create_client
from dotenv import load_dotenv

# Carga /app/.env explicitamente -- necesario porque cron NO hereda
# las variables de entorno del contenedor por defecto.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("etl")

FECHA_INICIO = os.environ.get("ETL_FECHA_INICIO", "2025-01-01")

# Si Oracle devuelve menos filas que esto, algo anda mal (la operacion
# no pasa de cientos de combinaciones zona x mes a cero de un dia a otro).
# Abortamos sin tocar Supabase en vez de escribir datos incompletos.
MIN_FILAS_ESPERADAS = int(os.environ.get("ETL_MIN_FILAS", "10"))

QUERY = """
SELECT
    TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM')                               AS ANIO_MES,
    COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')  AS ZONA,
    COUNT(*)                                                         AS TOTAL,
    ROUND(AVG(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS PROMEDIO_DIAS,
    ROUND(MEDIAN(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)       AS MEDIANA_DIAS,
    ROUND(MAX(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS MAXIMO_DIAS,
    COUNT(FACT.FECHA_PRIMERA_FACTURA)                                AS TOTAL_CON_FACTURA,
    SUM(
        CASE WHEN FACT.FECHA_PRIMERA_FACTURA IS NOT NULL
                  AND (FACT.FECHA_PRIMERA_FACTURA < LR.FECHA_SURTIDO
                       OR FACT.FECHA_PRIMERA_FACTURA > LR.FECHA_RUTA)
             THEN 1 ELSE 0 END
    )                                                                 AS FACTURAS_FUERA_DE_RANGO

FROM VTATD_COTIZACION COT
         INNER JOIN LOGTR_RECEPCION LR ON (COT.ID_COTIZACION = LR.ID_COTIZACION)
         INNER JOIN VTATC_STATUS_COTIZACION STC ON (COT.STATUS = STC.CLAVE)
         LEFT JOIN COBTR_DIRECCION DIRFIS ON (COT.ID_DIRECCION_FISCAL = DIRFIS.ID_DIRECCION)
         LEFT JOIN COBTR_DIRECCION DIRENT ON (COT.ID_DIRECCION_ENTREGA = DIRENT.ID_DIRECCION)
         LEFT JOIN UTITC_ZONA ZONAFIS ON (DIRFIS.ID_ZONA = ZONAFIS.ID_ZONA)
         LEFT JOIN UTITC_ZONA ZONAENT ON (DIRENT.ID_ZONA = ZONAENT.ID_ZONA)
         LEFT JOIN (
             SELECT PED.ID_COTIZACION,
                    MIN(FAC.FECHA_FACTURA)         AS FECHA_PRIMERA_FACTURA,
                    MAX(FAC.FECHA_FACTURA)         AS FECHA_ULTIMA_FACTURA,
                    COUNT(DISTINCT FAC.ID_FACTURA) AS TOTAL_FACTURAS
             FROM        VTATD_PEDIDO PED
                             INNER JOIN VTATD_REMISION REM         ON (PED.ID_PEDIDO   = REM.ID_PEDIDO)
                             INNER JOIN VTATR_FACTURA_REMISION FR  ON (REM.ID_REMISION = FR.ID_REMISION)
                             INNER JOIN VTATD_FACTURA FAC          ON (FR.ID_FACTURA   = FAC.ID_FACTURA)
             WHERE       PED.ID_COTIZACION IS NOT NULL
             GROUP BY    PED.ID_COTIZACION
         ) FACT ON (COT.ID_COTIZACION = FACT.ID_COTIZACION)

WHERE LR.BANDERA_VALIDADO = 'V'
  AND STC.DESCRIPCION = 'FACTURADA'
  AND NVL(COT.TIPO_EMBARQUE, 'EMBARQUE') = 'EMBARQUE'
  AND LR.FECHA_RECEPCION IS NOT NULL
  AND LR.FECHA_SURTIDO   IS NOT NULL
  AND LR.FECHA_RUTA      IS NOT NULL
  AND LR.FECHA_ENTREGADO IS NOT NULL
  AND LR.FECHA_VALIDADO  IS NOT NULL
  AND LR.FECHA_ENTREGADO <> LR.FECHA_VALIDADO
  AND LR.FECHA_RUTA >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')
  AND LR.FECHA_RUTA <  TRUNC(SYSDATE)

GROUP BY TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM'),
         COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')
ORDER BY ANIO_MES, ZONA
"""


def fetch_from_oracle() -> list[dict]:
    log.info("Conectando a Oracle (modo thin, sin Instant Client)...")
    with oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        dsn=os.environ["ORACLE_DSN"],
        tcp_connect_timeout=30,
    ) as conn:
        conn.call_timeout = 300_000  # 5 min max por query, en milisegundos
        with conn.cursor() as cur:
            cur.execute(QUERY, fecha_inicio=FECHA_INICIO)
            cols = [c[0].lower() for c in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    log.info(f"Oracle devolvio {len(rows)} filas (zona x mes).")
    return rows


def push_to_supabase(client, rows: list[dict]) -> None:
    """
    UPSERT en lugar de DELETE + INSERT.

    Con delete+insert, si el proceso falla entre ambos pasos la tabla queda
    VACIA y el tablero no muestra nada hasta la corrida del dia siguiente.
    El upsert aprovecha la restriccion unique (anio_mes, zona) del esquema:
    actualiza lo que ya existe, inserta lo nuevo, y nunca deja la tabla en
    un estado vacio.
    """
    ahora = datetime.now(timezone.utc).isoformat()
    for r in rows:
        r["actualizado_en"] = ahora

    CHUNK = 100
    for i in range(0, len(rows), CHUNK):
        lote = rows[i:i + CHUNK]
        client.table("reporte_tiempos_zona_mes").upsert(
            lote, on_conflict="anio_mes,zona"
        ).execute()
        log.info(f"  Upsert {i + len(lote)}/{len(rows)}")

    log.info("Tabla reporte_tiempos_zona_mes actualizada.")


def limpiar_obsoletos(client, rows: list[dict]) -> int:
    """
    Elimina filas en Supabase que ya no existen en el origen.

    Caso real: si una cotizacion se cancela o se recategoriza y una
    combinacion zona x mes se queda sin registros, la fila vieja quedaria
    ahi para siempre mostrando datos que ya no son ciertos.
    """
    vigentes = {(r["anio_mes"], r["zona"]) for r in rows}
    existentes = client.table("reporte_tiempos_zona_mes") \
        .select("id, anio_mes, zona").execute().data or []

    obsoletos = [e["id"] for e in existentes
                 if (e["anio_mes"], e["zona"]) not in vigentes]

    if obsoletos:
        log.info(f"Eliminando {len(obsoletos)} filas obsoletas...")
        client.table("reporte_tiempos_zona_mes") \
            .delete().in_("id", obsoletos).execute()
    return len(obsoletos)


def actualizar_status(client, filas: int, duracion: float,
                      estado: str, error: str = None) -> None:
    client.table("etl_status").upsert({
        "id": 1,
        "ultima_corrida": datetime.now(timezone.utc).isoformat(),
        "fecha_corte": date.today().isoformat(),
        "filas_procesadas": filas,
        "duracion_segundos": round(duracion, 2),
        "estado": estado,
        "mensaje_error": error,
    }).execute()


def main() -> int:
    inicio = time.time()
    client = None
    try:
        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )

        rows = fetch_from_oracle()

        # Salvaguarda: nunca escribir si el origen devolvio sospechosamente
        # poco. Es preferible dejar el dato de ayer que romper el tablero.
        if len(rows) < MIN_FILAS_ESPERADAS:
            raise RuntimeError(
                f"Oracle devolvio solo {len(rows)} filas, menos del minimo "
                f"esperado ({MIN_FILAS_ESPERADAS}). Se aborta sin tocar "
                f"Supabase para no dejar el tablero incompleto."
            )

        push_to_supabase(client, rows)
        eliminadas = limpiar_obsoletos(client, rows)

        duracion = time.time() - inicio
        actualizar_status(client, len(rows), duracion, "OK")
        log.info(
            f"ETL completado en {duracion:.1f}s. "
            f"Filas: {len(rows)}, obsoletas eliminadas: {eliminadas}"
        )
        return 0

    except Exception as exc:
        duracion = time.time() - inicio
        log.exception("ETL fallo")
        if client is not None:
            try:
                actualizar_status(client, 0, duracion, "ERROR", str(exc)[:500])
            except Exception:
                log.exception("Tampoco se pudo registrar el error en etl_status")
        return 1


if __name__ == "__main__":
    sys.exit(main())
