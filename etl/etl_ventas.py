"""
ETL de VENTAS: DB de Oracle (SOLO LECTURA) -> DB del tablero (Supabase).

Se apoya en etl.py para conexion, DSN y arranque del cliente Oracle.
No modifica etl.py: el ETL de logistica sigue igual.

Uso:
    python etl_ventas.py --empresa cfs --dry-run    # no escribe nada
    python etl_ventas.py --empresa cfs

Diferencias contra el ETL de logistica, todas por escala:

1. Son ~106,000 filas por empresa contra unos cientos en logistica.
   El lote de upsert sube de 100 a 500.

2. La purga de obsoletos NO lista la tabla completa. Todas las filas
   de la corrida se escriben con el mismo actualizado_en, y al final
   se borra lo que quedo con un valor anterior. Es un DELETE contra
   107 paginaciones. Solo se ejecuta si TODOS los lotes pasaron: si
   uno falla, no se barre nada y la tabla queda con datos viejos
   pero completos.

3. La dimension 'cliente' se reagrupa en Python contra clientes_alias
   antes de subir. Dos codigos duplicados colapsan en una fila.
"""

import os
import sys
import time
import logging
import argparse
from collections import defaultdict
from datetime import datetime, date, timezone

import oracledb
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from etl import (           # noqa: E402
    iniciar_cliente_oracle,
    construir_dsn,
    calcular_fecha_inicio,
    SOLO_LECTURA,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("etl_ventas")

AREA = "ventas"
TABLA = "ventas_agregado"
CHUNK_UPSERT = 500
MIN_FILAS_ESPERADAS = int(os.environ.get("ETL_VENTAS_MIN_FILAS", "1000"))

LLAVE = ("empresa", "fecha_cotizacion", "canal", "dimension", "dimension_id")

# Los tipos importan: PostgREST manda el JSON tal cual y una columna
# INTEGER rechaza "0.0" con 22P02. Oracle devuelve todo como Decimal,
# asi que hay que separar a mano lo que es conteo de lo que es dinero.
METRICAS_ENTERAS = [
    "reng_max_convertido",
    "reng_cotizados",
    "reng_facturados",
    "cotizaciones",
    "cotiz_sin_seguimiento",
    "cotiz_suspendidas",
    "cotiz_canceladas",
]
METRICAS_DECIMALES = [
    "imp_cotizado",
    "imp_facturado",
    "imp_cot_convertido",
    "imp_sin_seguimiento",
    "imp_suspendido",
    "imp_cancelado",
    "imp_en_proceso",
    "imp_reng_max",
    "cant_reng_max",
]

METRICAS_SUMA = METRICAS_ENTERAS + [
    "imp_cotizado",
    "imp_facturado",
    "imp_cot_convertido",
    "imp_sin_seguimiento",
    "imp_suspendido",
    "imp_cancelado",
    "imp_en_proceso",
]
METRICAS_MAX = [
    "imp_reng_max",
    "cant_reng_max",
]


# ------------------------------------------------------------------
# Query. La dimension producto sale a grano MENSUAL a proposito:
# a grano diario son 227,088 filas contra 29,809 de cliente, el 85%
# de la tabla para una cola larga que nadie consulta por dia. La
# serie diaria sale completa de la dimension cliente, que suma igual.
# ------------------------------------------------------------------
QUERY = """
WITH factura_por_renglon AS (
    SELECT /*+ MATERIALIZE */
        rp.ID_RENGLON_COTIZACION      AS id_renglon_cotizacion,
        NVL(SUM(rf.IMPORTE), 0)       AS importe_facturado
    FROM
        SHUMA.VTATD_RENG_PEDIDO rp
        JOIN SHUMA.VTATD_RENG_REMISION rr
          ON rr.ID_RENGLON_PEDIDO = rp.ID_RENGLON_PEDIDO
        JOIN SHUMA.VTATD_RENG_FACTURA rf
          ON rf.ID_RENGLON_REMISION = rr.ID_RENGLON_REMISION
    WHERE
        rp.ID_RENGLON_COTIZACION IS NOT NULL
    GROUP BY
        rp.ID_RENGLON_COTIZACION
),

renglones AS (
    SELECT /*+ MATERIALIZE */
        TRUNC(cot.FECHA_COTIZACION)   AS fecha_cotizacion,
        cot.ID_COTIZACION             AS id_cotizacion,
        cot.ID_CLIENTE                AS id_cliente,
        cot.ID_EMPLEADO               AS id_empleado,
        cot.STATUS                    AS status_cotizacion,
        rc.ID_ARTICULO                AS id_articulo,
        rc.IMPORTE                    AS importe_cotizado,
        rc.CANTIDAD_VENDIDA           AS cantidad_cotizada,
        NVL(art.DESCRIPCION, 'SIN NOMBRE') AS art_descripcion,
        CASE
            WHEN fac.id_renglon_cotizacion IS NOT NULL THEN 1
            ELSE 0
        END                           AS convertido,
        NVL(fac.importe_facturado, 0) AS importe_facturado,
        CASE
            WHEN cli.CODIGO_CLIENTE IN ('1403', '3064', '400', '1643', '1686')
                THEN 'intercompania'
            WHEN cli.CODIGO_CLIENTE IN ('688', '1276')
                THEN 'interno'
            WHEN cli.ES_MOSTRADOR = 'S'
                THEN 'mostrador'
            ELSE
                'externo'
        END                           AS canal
    FROM
        SHUMA.VTATD_RENG_COTIZACION rc
        JOIN SHUMA.VTATD_COTIZACION cot
          ON cot.ID_COTIZACION = rc.ID_COTIZACION
        LEFT JOIN SHUMA.COBTC_CLIENTE cli
          ON cli.ID_CLIENTE = cot.ID_CLIENTE
        LEFT JOIN SHUMA.INVTC_ARTICULO art
          ON art.ID_ARTICULO = rc.ID_ARTICULO
        LEFT JOIN factura_por_renglon fac
          ON fac.id_renglon_cotizacion = rc.ID_RENGLON_COTIZACION
    WHERE
        cot.FECHA_COTIZACION >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')
        AND cot.FECHA_COTIZACION < TRUNC(SYSDATE)
),

clasificado AS (
    SELECT
        r.*,
        CASE WHEN r.status_cotizacion = 'F'         THEN 1 ELSE 0 END AS es_sin_seguim,
        CASE WHEN r.status_cotizacion = 'R'         THEN 1 ELSE 0 END AS es_suspendida,
        CASE WHEN r.status_cotizacion IN ('B', 'E') THEN 1 ELSE 0 END AS es_cancelada
    FROM
        renglones r
)

SELECT
    'producto'                             AS dimension,
    TO_CHAR(c.id_articulo)                 AS dimension_id,
    NVL(TO_CHAR(art.CODIGO), 'S/C')        AS dimension_codigo,
    NVL(art.DESCRIPCION, 'SIN NOMBRE')     AS dimension_nombre,
    CAST(NULL AS VARCHAR2(10))             AS dimension_grupo,
    CAST(NULL AS NUMBER)                   AS dimension_activo,
    c.canal                                AS canal,
    TRUNC(c.fecha_cotizacion, 'MM')        AS fecha_cotizacion,
    COUNT(*)                               AS reng_cotizados,
    SUM(c.convertido)                      AS reng_facturados,
    NVL(SUM(c.importe_cotizado), 0)        AS imp_cotizado,
    NVL(SUM(c.importe_facturado), 0)       AS imp_facturado,
    NVL(SUM(CASE WHEN c.convertido = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cot_convertido,
    -- Los cuatro importes de abajo mas imp_cot_convertido parten
    -- imp_cotizado sin traslape y sin dejar residuo. Se calculan
    -- por status porque el porcentaje solo no mueve a nadie: 7.7%
    -- de cotizaciones sin seguimiento no dice nada, y los pesos
    -- que representan si.
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_sin_seguim = 1
                 THEN c.importe_cotizado END), 0)  AS imp_sin_seguimiento,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_suspendida = 1
                 THEN c.importe_cotizado END), 0)  AS imp_suspendido,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_cancelada = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cancelado,
    NVL(SUM(CASE WHEN c.convertido = 0
                  AND c.es_sin_seguim = 0
                  AND c.es_suspendida = 0
                  AND c.es_cancelada = 0
                 THEN c.importe_cotizado END), 0)  AS imp_en_proceso,
    NVL(MAX(c.importe_cotizado), 0)        AS imp_reng_max,
    -- Los tres salen del MISMO renglon: el de mayor importe.
    -- Antes cant_reng_max era un MAX independiente, asi que podia
    -- mostrar el importe de una linea y la cantidad de otra.
    NVL(MAX(c.cantidad_cotizada)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS cant_reng_max,
    MAX(c.art_descripcion)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC)     AS art_reng_max,
    NVL(MAX(c.convertido)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS reng_max_convertido,
    COUNT(DISTINCT c.id_cotizacion)        AS cotizaciones,
    COUNT(DISTINCT CASE WHEN c.es_sin_seguim = 1 THEN c.id_cotizacion END) AS cotiz_sin_seguimiento,
    COUNT(DISTINCT CASE WHEN c.es_suspendida = 1 THEN c.id_cotizacion END) AS cotiz_suspendidas,
    COUNT(DISTINCT CASE WHEN c.es_cancelada  = 1 THEN c.id_cotizacion END) AS cotiz_canceladas
FROM
    clasificado c
    LEFT JOIN SHUMA.INVTC_ARTICULO art
      ON art.ID_ARTICULO = c.id_articulo
GROUP BY
    c.id_articulo,
    NVL(TO_CHAR(art.CODIGO), 'S/C'),
    NVL(art.DESCRIPCION, 'SIN NOMBRE'),
    c.canal,
    TRUNC(c.fecha_cotizacion, 'MM')

UNION ALL

SELECT
    'cliente'                                 AS dimension,
    TO_CHAR(c.id_cliente)                     AS dimension_id,
    NVL(TO_CHAR(cli.CODIGO_CLIENTE), 'S/C')   AS dimension_codigo,
    NVL(cli.NOMBRE_RAZONSOCIAL, 'SIN NOMBRE') AS dimension_nombre,
    CAST(NULL AS VARCHAR2(10))                AS dimension_grupo,
    CAST(NULL AS NUMBER)                      AS dimension_activo,
    c.canal                                   AS canal,
    c.fecha_cotizacion                        AS fecha_cotizacion,
    COUNT(*)                                  AS reng_cotizados,
    SUM(c.convertido)                         AS reng_facturados,
    NVL(SUM(c.importe_cotizado), 0)           AS imp_cotizado,
    NVL(SUM(c.importe_facturado), 0)          AS imp_facturado,
    NVL(SUM(CASE WHEN c.convertido = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cot_convertido,
    -- Los cuatro importes de abajo mas imp_cot_convertido parten
    -- imp_cotizado sin traslape y sin dejar residuo. Se calculan
    -- por status porque el porcentaje solo no mueve a nadie: 7.7%
    -- de cotizaciones sin seguimiento no dice nada, y los pesos
    -- que representan si.
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_sin_seguim = 1
                 THEN c.importe_cotizado END), 0)  AS imp_sin_seguimiento,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_suspendida = 1
                 THEN c.importe_cotizado END), 0)  AS imp_suspendido,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_cancelada = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cancelado,
    NVL(SUM(CASE WHEN c.convertido = 0
                  AND c.es_sin_seguim = 0
                  AND c.es_suspendida = 0
                  AND c.es_cancelada = 0
                 THEN c.importe_cotizado END), 0)  AS imp_en_proceso,
    NVL(MAX(c.importe_cotizado), 0)           AS imp_reng_max,
    -- Los tres salen del MISMO renglon: el de mayor importe.
    -- Antes cant_reng_max era un MAX independiente, asi que podia
    -- mostrar el importe de una linea y la cantidad de otra.
    NVL(MAX(c.cantidad_cotizada)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS cant_reng_max,
    MAX(c.art_descripcion)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC)     AS art_reng_max,
    NVL(MAX(c.convertido)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS reng_max_convertido,
    COUNT(DISTINCT c.id_cotizacion)           AS cotizaciones,
    COUNT(DISTINCT CASE WHEN c.es_sin_seguim = 1 THEN c.id_cotizacion END) AS cotiz_sin_seguimiento,
    COUNT(DISTINCT CASE WHEN c.es_suspendida = 1 THEN c.id_cotizacion END) AS cotiz_suspendidas,
    COUNT(DISTINCT CASE WHEN c.es_cancelada  = 1 THEN c.id_cotizacion END) AS cotiz_canceladas
FROM
    clasificado c
    LEFT JOIN SHUMA.COBTC_CLIENTE cli
      ON cli.ID_CLIENTE = c.id_cliente
GROUP BY
    c.id_cliente,
    NVL(TO_CHAR(cli.CODIGO_CLIENTE), 'S/C'),
    NVL(cli.NOMBRE_RAZONSOCIAL, 'SIN NOMBRE'),
    c.canal,
    c.fecha_cotizacion

UNION ALL

SELECT
    'vendedor'                              AS dimension,
    TO_CHAR(c.id_empleado)                  AS dimension_id,
    NVL(TO_CHAR(emp.CLAVE_EMPLEADO), 'S/C') AS dimension_codigo,
    NVL(
        TRIM(
            emp.NOMBRE
            || ' ' || NVL(emp.APELLIDO_PATERNO, '')
            || ' ' || NVL(emp.APELLIDO_MATERNO, '')
        ),
        'SIN NOMBRE'
    )                                       AS dimension_nombre,
    NVL(tip.CLAVE, 'S/T')                   AS dimension_grupo,
    CASE
        WHEN emp.STATUS = 'ACTIVO' THEN 1
        ELSE 0
    END                                     AS dimension_activo,
    c.canal                                 AS canal,
    c.fecha_cotizacion                      AS fecha_cotizacion,
    COUNT(*)                                AS reng_cotizados,
    SUM(c.convertido)                       AS reng_facturados,
    NVL(SUM(c.importe_cotizado), 0)         AS imp_cotizado,
    NVL(SUM(c.importe_facturado), 0)        AS imp_facturado,
    NVL(SUM(CASE WHEN c.convertido = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cot_convertido,
    -- Los cuatro importes de abajo mas imp_cot_convertido parten
    -- imp_cotizado sin traslape y sin dejar residuo. Se calculan
    -- por status porque el porcentaje solo no mueve a nadie: 7.7%
    -- de cotizaciones sin seguimiento no dice nada, y los pesos
    -- que representan si.
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_sin_seguim = 1
                 THEN c.importe_cotizado END), 0)  AS imp_sin_seguimiento,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_suspendida = 1
                 THEN c.importe_cotizado END), 0)  AS imp_suspendido,
    NVL(SUM(CASE WHEN c.convertido = 0 AND c.es_cancelada = 1
                 THEN c.importe_cotizado END), 0)  AS imp_cancelado,
    NVL(SUM(CASE WHEN c.convertido = 0
                  AND c.es_sin_seguim = 0
                  AND c.es_suspendida = 0
                  AND c.es_cancelada = 0
                 THEN c.importe_cotizado END), 0)  AS imp_en_proceso,
    NVL(MAX(c.importe_cotizado), 0)         AS imp_reng_max,
    -- Los tres salen del MISMO renglon: el de mayor importe.
    -- Antes cant_reng_max era un MAX independiente, asi que podia
    -- mostrar el importe de una linea y la cantidad de otra.
    NVL(MAX(c.cantidad_cotizada)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS cant_reng_max,
    MAX(c.art_descripcion)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC)     AS art_reng_max,
    NVL(MAX(c.convertido)
        KEEP (DENSE_RANK FIRST ORDER BY c.importe_cotizado DESC), 0) AS reng_max_convertido,
    COUNT(DISTINCT c.id_cotizacion)         AS cotizaciones,
    COUNT(DISTINCT CASE WHEN c.es_sin_seguim = 1 THEN c.id_cotizacion END) AS cotiz_sin_seguimiento,
    COUNT(DISTINCT CASE WHEN c.es_suspendida = 1 THEN c.id_cotizacion END) AS cotiz_suspendidas,
    COUNT(DISTINCT CASE WHEN c.es_cancelada  = 1 THEN c.id_cotizacion END) AS cotiz_canceladas
FROM
    clasificado c
    LEFT JOIN SHUMA.VTATC_EMPLEADO emp
      ON emp.ID_EMPLEADO = c.id_empleado
    LEFT JOIN SHUMA.UTITC_TIPO_EMPLEADO tip
      ON tip.ID_TIPO_EMPLEADO = emp.ID_TIPO_EMPLEADO
GROUP BY
    c.id_empleado,
    NVL(TO_CHAR(emp.CLAVE_EMPLEADO), 'S/C'),
    NVL(
        TRIM(
            emp.NOMBRE
            || ' ' || NVL(emp.APELLIDO_PATERNO, '')
            || ' ' || NVL(emp.APELLIDO_MATERNO, '')
        ),
        'SIN NOMBRE'
    ),
    NVL(tip.CLAVE, 'S/T'),
    CASE
        WHEN emp.STATUS = 'ACTIVO' THEN 1
        ELSE 0
    END,
    c.canal,
    c.fecha_cotizacion
"""


def fetch_from_oracle(empresa: str) -> list[dict]:
    """Ejecuta el query de ventas contra la instancia de la empresa."""
    emp = empresa.upper()
    iniciar_cliente_oracle()
    log.info(f"[{empresa}] Conectando a Oracle...")

    with oracledb.connect(
        user=os.environ[f"ORACLE_{emp}_USER"],
        password=os.environ[f"ORACLE_{emp}_PASSWORD"],
        dsn=construir_dsn(empresa),
        tcp_connect_timeout=30,
    ) as conn:
        conn.call_timeout = 600_000  # 10 min: son 2.7M renglones
        with conn.cursor() as cur:
            cur.execute(SOLO_LECTURA)
            log.info(f"[{empresa}]   Sesion marcada READ ONLY.")

            fecha_ini = calcular_fecha_inicio()
            cur.execute(QUERY, fecha_inicio=fecha_ini)
            cols = [c[0].lower() for c in cur.description]
            filas = [dict(zip(cols, r)) for r in cur.fetchall()]

    for r in filas:
        r["empresa"] = empresa
        f = r["fecha_cotizacion"]
        r["fecha_cotizacion"] = f.date().isoformat() if hasattr(f, "date") else str(f)
        for k in METRICAS_ENTERAS:
            r[k] = int(r[k] or 0)
        for k in METRICAS_DECIMALES:
            r[k] = round(float(r[k] or 0), 2)

    log.info(f"[{empresa}] Oracle devolvio {len(filas):,} filas.")
    return filas


def cargar_alias(client, empresa: str) -> dict:
    """Lee clientes_alias de Supabase: {codigo_alias: codigo_canonico}."""
    res = client.table("clientes_alias") \
        .select("codigo_alias, codigo_canonico") \
        .eq("empresa", empresa) \
        .execute()
    mapa = {r["codigo_alias"]: r["codigo_canonico"] for r in (res.data or [])}
    log.info(f"[{empresa}] {len(mapa)} alias de cliente cargados.")
    return mapa


def aplicar_alias(filas: list[dict], mapa: dict) -> list[dict]:
    """
    Colapsa los codigos duplicados de cliente en su codigo canonico y
    reagrupa. Solo toca dimension = 'cliente'; producto y vendedor
    pasan intactos.

    El SGE no puede fusionar clientes porque un CFDI timbrado no cambia
    de receptor, asi que la consolidacion vive aqui.
    """
    if not mapa:
        return filas

    afectadas = [r for r in filas
                 if r["dimension"] == "cliente" and r["dimension_codigo"] in mapa]
    if not afectadas:
        log.info("   Ningun alias con movimiento en la ventana.")
        return filas

    # Codigo canonico -> su dimension_id e identidad, tomados de las
    # filas que ya tenemos. Si el canonico no aparece en la ventana se
    # conserva la identidad del alias con mas renglones.
    identidad = {}
    for r in filas:
        if r["dimension"] != "cliente":
            continue
        canon = mapa.get(r["dimension_codigo"], r["dimension_codigo"])
        actual = identidad.get(canon)
        propio = r["dimension_codigo"] == canon
        if actual is None or (propio and not actual["propio"]):
            identidad[canon] = {
                "propio": propio,
                "dimension_id": r["dimension_id"],
                "dimension_nombre": r["dimension_nombre"],
            }

    resto = [r for r in filas if r["dimension"] != "cliente"]
    grupos: dict = defaultdict(list)
    for r in filas:
        if r["dimension"] != "cliente":
            continue
        canon = mapa.get(r["dimension_codigo"], r["dimension_codigo"])
        grupos[(r["empresa"], r["fecha_cotizacion"], r["canal"], canon)].append(r)

    fusionadas = []
    for (empresa, fecha, canal, canon), grupo in grupos.items():
        ident = identidad[canon]
        fila = {
            "empresa": empresa,
            "fecha_cotizacion": fecha,
            "canal": canal,
            "dimension": "cliente",
            "dimension_id": ident["dimension_id"],
            "dimension_codigo": canon,
            "dimension_nombre": ident["dimension_nombre"],
        }
        for k in METRICAS_ENTERAS:
            fila[k] = int(sum(g[k] for g in grupo))
        for k in ("imp_cotizado", "imp_facturado", "imp_cot_convertido",
                  "imp_sin_seguimiento", "imp_suspendido",
                  "imp_cancelado", "imp_en_proceso"):
            fila[k] = round(sum(g[k] for g in grupo), 2)
        fila["imp_reng_max"] = round(max(g["imp_reng_max"] for g in grupo), 2)
        # cant, articulo y convertido describen UN renglon concreto: el
        # de mayor importe. Se copian de esa fila, no se recalculan por
        # separado, o se mezclarian datos de renglones distintos.
        dom = max(grupo, key=lambda g: g["imp_reng_max"])
        fila["cant_reng_max"] = round(dom["cant_reng_max"], 2)
        fila["art_reng_max"] = dom["art_reng_max"]
        fila["reng_max_convertido"] = int(dom["reng_max_convertido"])
        fusionadas.append(fila)

    colapsadas = len(grupos) - len(
        {(r["empresa"], r["fecha_cotizacion"], r["canal"], r["dimension_codigo"])
         for r in filas if r["dimension"] == "cliente"}
    )
    log.info(f"   Alias aplicados: {len(afectadas):,} filas de cliente "
             f"colapsadas en {abs(colapsadas):,} menos.")
    return resto + fusionadas


def push_to_supabase(client, filas: list[dict], marca: str) -> None:
    """
    Upsert por lotes sobre la restriccion uq_ventas_grano.

    No es DELETE + INSERT: si el proceso muere a la mitad, el tablero
    queda con datos viejos completos en lugar de una tabla vacia.
    """
    for r in filas:
        r["actualizado_en"] = marca

    total = len(filas)
    for i in range(0, total, CHUNK_UPSERT):
        lote = filas[i:i + CHUNK_UPSERT]
        client.table(TABLA).upsert(
            lote, on_conflict=",".join(LLAVE)
        ).execute()
        hechas = min(i + CHUNK_UPSERT, total)
        if hechas % 10_000 < CHUNK_UPSERT or hechas == total:
            log.info(f"   Upsert {hechas:,}/{total:,}")


def barrer_obsoletos(client, empresa: str, marca: str) -> int:
    """
    Borra lo que no toco esta corrida, comparando la marca de agua.

    Se llama SOLO despues de que todos los lotes pasaron. Si alguno
    fallo, esta funcion no corre: borrar aqui dejaria huecos reales.
    """
    res = client.table(TABLA) \
        .delete() \
        .eq("empresa", empresa) \
        .lt("actualizado_en", marca) \
        .execute()
    n = len(res.data or [])
    if n:
        log.info(f"[{empresa}] Barridas {n:,} filas obsoletas.")
    return n


def actualizar_estado(client, empresa: str, filas: int, duracion: float,
                      estado: str, error: str = None) -> None:
    """Registra la corrida en etl_estado, con llave (empresa, area)."""
    client.table("etl_estado").upsert({
        "empresa": empresa,
        "area": AREA,
        "ultima_corrida": datetime.now(timezone.utc).isoformat(),
        "fecha_corte": date.today().isoformat(),
        "filas_procesadas": filas,
        "duracion_segundos": round(duracion, 2),
        "estado": estado,
        "mensaje_error": error,
    }, on_conflict="empresa,area").execute()


def resumen(filas: list[dict], empresa: str) -> None:
    """Control cruzado. Las tres dimensiones deben sumar identico."""
    por_dim = defaultdict(lambda: defaultdict(float))
    for r in filas:
        d = por_dim[r["dimension"]]
        d["filas"] += 1
        d["reng_cotizados"] += r["reng_cotizados"]
        d["imp_cotizado"] += r["imp_cotizado"]

    log.info(f"[{empresa}] --- Control cruzado ---")
    for dim in ("producto", "cliente", "vendedor"):
        d = por_dim.get(dim)
        if not d:
            log.warning(f"   {dim:<9} SIN FILAS")
            continue
        log.info(f"   {dim:<9} filas {int(d['filas']):>7,}  "
                 f"renglones {int(d['reng_cotizados']):>9,}  "
                 f"cotizado {d['imp_cotizado']:>18,.2f}")

    totales = {round(d["imp_cotizado"], 2) for d in por_dim.values()}
    if len(totales) > 1:
        log.error("   Las dimensiones NO cuadran. Revisar antes de publicar.")
    else:
        log.info("   Las tres dimensiones cuadran.")

    por_canal = defaultdict(float)
    for r in filas:
        if r["dimension"] == "cliente":
            por_canal[r["canal"]] += r["imp_cotizado"]
    for canal, imp in sorted(por_canal.items(), key=lambda x: -x[1]):
        log.info(f"   canal {canal:<14} {imp:>18,.2f}")

    cuentas_mostrador = len({
        r["dimension_id"] for r in filas
        if r["canal"] == "mostrador" and r["dimension"] == "cliente"
    })
    log.info(f"   cuentas distintas en mostrador: {cuentas_mostrador}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="ETL de ventas: Oracle (solo lectura) -> Supabase")
    parser.add_argument("--empresa", required=True,
                        help="Identificador de empresa: cfs o acabados")
    parser.add_argument("--dry-run", action="store_true",
                        help="Consulta Oracle y muestra el resumen SIN escribir nada.")
    args = parser.parse_args()

    empresa = args.empresa.lower()
    if empresa not in ("cfs", "acabados"):
        log.error("Empresa invalida. Usa 'cfs' o 'acabados', en minusculas.")
        return 1

    inicio = time.time()
    client = None
    try:
        filas = fetch_from_oracle(empresa)

        if len(filas) < MIN_FILAS_ESPERADAS:
            raise RuntimeError(
                f"Solo {len(filas)} filas, se esperaban al menos "
                f"{MIN_FILAS_ESPERADAS}. No se publica: es mas probable "
                f"un fallo de origen que una caida real de ventas.")

        if args.dry_run:
            resumen(filas, empresa)
            log.info(f"[{empresa}] MODO PRUEBA: no se escribio en Supabase.")
            return 0

        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )

        filas = aplicar_alias(filas, cargar_alias(client, empresa))
        resumen(filas, empresa)

        marca = datetime.now(timezone.utc).isoformat()
        push_to_supabase(client, filas, marca)
        barrer_obsoletos(client, empresa, marca)

        dur = time.time() - inicio
        actualizar_estado(client, empresa, len(filas), dur, "OK")
        log.info(f"[{empresa}] Listo: {len(filas):,} filas en {dur:.1f}s.")
        return 0

    except Exception as e:
        log.exception(f"[{empresa}] El ETL fallo.")
        if client is not None:
            try:
                actualizar_estado(client, empresa, 0,
                                  time.time() - inicio, "ERROR", str(e)[:500])
            except Exception:
                log.error("Ademas fallo el registro del error en etl_estado.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
