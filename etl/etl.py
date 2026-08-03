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
import argparse
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

# ============================================================
# VENTANA DE HISTORIA
#
# Por defecto se conservan los ultimos 25 meses. El motivo del 25 y no
# 12: para comparar un mes contra el mismo mes del ano anterior hacen
# falta al menos 13 meses de historia. Con 25 esa comparacion siempre
# tiene con que trabajar y ademas quedan dos anos de tendencia.
#
# La tabla en Supabase se estabiliza asi en unas 340 filas y deja de
# crecer: las filas que salen de la ventana las borra limpiar_obsoletos.
#
# Para usar una fecha fija en vez de ventana movil, define
# ETL_FECHA_INICIO (por ejemplo 2025-01-01) y tiene prioridad.
# ============================================================
MESES_HISTORIA = int(os.environ.get("ETL_MESES_HISTORIA", "25"))


def calcular_fecha_inicio() -> str:
    """Primer dia del mes, MESES_HISTORIA meses hacia atras."""
    fijo = os.environ.get("ETL_FECHA_INICIO")
    if fijo:
        log.info(f"Usando fecha de inicio fija: {fijo}")
        return fijo

    hoy = date.today()
    total = hoy.year * 12 + (hoy.month - 1) - MESES_HISTORIA
    inicio = date(total // 12, total % 12 + 1, 1)
    log.info(f"Ventana movil de {MESES_HISTORIA} meses: desde {inicio}")
    return inicio.isoformat()

# Si Oracle devuelve menos filas que esto, algo anda mal (la operacion
# no pasa de cientos de combinaciones zona x mes a cero de un dia a otro).
# Abortamos sin tocar Supabase en vez de escribir datos incompletos.
MIN_FILAS_ESPERADAS = int(os.environ.get("ETL_MIN_FILAS", "10"))

# ============================================================
# PROTECCION DE ESCRITURA
#
# El usuario de Oracle disponible tiene permisos de UPDATE, no es de
# solo lectura. Para que este proceso no pueda escribir en produccion
# ni por accidente, cada sesion se marca como READ ONLY a nivel de base
# de datos: Oracle rechaza cualquier INSERT/UPDATE/DELETE con ORA-01456,
# sin importar los permisos que tenga el usuario.
#
# Es el mismo efecto que un usuario de solo lectura, aplicado por sesion.
# Aun asi, conviene pedir el usuario de solo lectura cuando se pueda:
# esto protege a este proceso, no a las credenciales si se filtran.
# ============================================================
SOLO_LECTURA = "SET TRANSACTION READ ONLY"

# ============================================================
# MODO THICK — obligatorio con Oracle 11g
#
# El modo "thin" de python-oracledb (el que no necesita instalar nada)
# solo funciona con Oracle 12.1 o superior. SGE_CFS_PROD corre sobre
# Oracle 11.2.0.1, asi que hay que usar el modo "thick", que se apoya
# en las librerias del Oracle Instant Client.
#
# Version del Instant Client: usar 19c. Las versiones 21c y 23ai ya no
# soportan conectarse a bases 11.2.
#
# ORACLE_CLIENT_DIR apunta a la carpeta donde se descomprimio:
#   Windows: C:\oracle\instantclient_19_28
#   Linux:   /opt/oracle/instantclient_19_28
# ============================================================
_cliente_iniciado = False


def iniciar_cliente_oracle() -> None:
    """Activa el modo thick una sola vez por proceso."""
    global _cliente_iniciado
    if _cliente_iniciado:
        return

    lib_dir = os.environ.get("ORACLE_CLIENT_DIR")
    if not lib_dir:
        log.warning("ORACLE_CLIENT_DIR no esta definida: se usara modo thin.")
        log.warning("Con Oracle 11g el modo thin NO funciona. Si la conexion")
        log.warning("falla con DPY-3010, define esa variable en el .env.")
        _cliente_iniciado = True
        return

    try:
        oracledb.init_oracle_client(lib_dir=lib_dir)
        log.info(f"Modo thick activado (Instant Client en {lib_dir})")
    except Exception as exc:
        if "has already been initialized" in str(exc):
            pass
        else:
            log.error(f"No se pudo cargar el Instant Client: {exc}")
            log.error("Revisa que ORACLE_CLIENT_DIR apunte a la carpeta que")
            log.error("contiene oci.dll (Windows) o libclntsh.so (Linux).")
            raise
    _cliente_iniciado = True

QUERY = """
SELECT
    TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM')                               AS ANIO_MES,
    COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')  AS ZONA,
    COUNT(*)                                                         AS TOTAL,

    -- ---------- Ciclo completo: cotizacion -> validacion ----------
    ROUND(AVG(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS PROMEDIO_DIAS,
    ROUND(MEDIAN(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)       AS MEDIANA_DIAS,
    ROUND(MAX(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS MAXIMO_DIAS,

    -- ---------- Las 6 etapas, en orden del proceso ----------
    ROUND(MEDIAN(WFL.FECHA_END        - COT.FECHA_COTIZACION), 3)    AS MED_COT_AUTORIZACION,
    ROUND(MEDIAN(LR.FECHA_RECEPCION   - WFL.FECHA_END), 3)           AS MED_AUTORIZACION_RECEPCION,
    ROUND(MEDIAN(LR.FECHA_SURTIDO     - LR.FECHA_RECEPCION), 3)      AS MED_RECEPCION_SURTIDO,
    ROUND(MEDIAN(LR.FECHA_RUTA        - LR.FECHA_SURTIDO), 3)        AS MED_SURTIDO_RUTA,
    ROUND(MEDIAN(LR.FECHA_ENTREGADO   - LR.FECHA_RUTA), 3)           AS MED_RUTA_ENTREGA,
    ROUND(MEDIAN(LR.FECHA_VALIDADO    - LR.FECHA_ENTREGADO), 3)      AS MED_ENTREGA_VALIDACION,

    -- ---------- Facturacion ----------
    COUNT(FACT.FECHA_PRIMERA_FACTURA)                                AS TOTAL_CON_FACTURA,
    ROUND(MEDIAN(FACT.FECHA_PRIMERA_FACTURA - LR.FECHA_ENTREGADO),3) AS MED_ENTREGA_FACTURA,

    -- ---------- Tipo de autorizacion solicitada ----------
    -- Una cotizacion puede requerir varias a la vez, por eso la suma
    -- de las tres puede superar el TOTAL.
    SUM(CASE WHEN WFL.FECHA_B1 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_LISTA,
    SUM(CASE WHEN WFL.FECHA_B2 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_CXC,
    SUM(CASE WHEN WFL.FECHA_B3 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_DESCUENTOS

FROM VTATD_COTIZACION COT
         INNER JOIN LOGTR_RECEPCION LR ON (COT.ID_COTIZACION = LR.ID_COTIZACION)
         INNER JOIN VTATC_STATUS_COTIZACION STC ON (COT.STATUS = STC.CLAVE)
         LEFT JOIN WFLTD_DOCUMENTO WFL ON (COT.ID_WFL_DOCUMENTO = WFL.ID_WFL_DOCUMENTO)
         LEFT JOIN COBTR_DIRECCION DIRFIS ON (COT.ID_DIRECCION_FISCAL = DIRFIS.ID_DIRECCION)
         LEFT JOIN COBTR_DIRECCION DIRENT ON (COT.ID_DIRECCION_ENTREGA = DIRENT.ID_DIRECCION)
         LEFT JOIN UTITC_ZONA ZONAFIS ON (DIRFIS.ID_ZONA = ZONAFIS.ID_ZONA)
         LEFT JOIN UTITC_ZONA ZONAENT ON (DIRENT.ID_ZONA = ZONAENT.ID_ZONA)
         LEFT JOIN (
             SELECT PED.ID_COTIZACION,
                    MIN(FAC.FECHA_FACTURA)         AS FECHA_PRIMERA_FACTURA,
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
  AND LR.FECHA_ENTREGADO <> LR.FECHA_VALIDADO   -- excluye cierres masivos por lote
  AND LR.FECHA_RUTA >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')
  AND LR.FECHA_RUTA <  TRUNC(SYSDATE)           -- corte en D-1

GROUP BY TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM'),
         COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')
ORDER BY ANIO_MES, ZONA
"""


def construir_dsn() -> str:
    """
    Arma el DSN de Oracle aceptando los tres formatos comunes.

    python-oracledb solo entiende el formato corto con SERVICE NAME
    (host:puerto/servicio). Con SID hay que armar el descriptor completo
    con makedsn(), porque el formato host:puerto:sid que usan JDBC y el
    viejo cx_Oracle NO lo reconoce: intenta buscarlo en tnsnames.ora y
    falla con DPY-4027.

    Formatos aceptados en ORACLE_DSN:
      host:puerto/servicio   -> se usa tal cual
      host:puerto:sid        -> se convierte a descriptor con SID
    Alternativa por variables sueltas:
      ORACLE_HOST + ORACLE_PORT + ORACLE_SID
    """
    host = os.environ.get("ORACLE_HOST")
    sid = os.environ.get("ORACLE_SID")
    if host and sid:
        port = int(os.environ.get("ORACLE_PORT", "1521"))
        dsn = oracledb.makedsn(host, port, sid=sid)
        log.info(f"DSN armado con SID: {host}:{port} SID={sid}")
        return dsn

    dsn = os.environ.get("ORACLE_DSN", "").strip()
    if not dsn:
        raise RuntimeError(
            "Falta ORACLE_DSN (o ORACLE_HOST + ORACLE_SID) en el .env")

    # Service name: formato nativo, se usa sin tocar
    if "/" in dsn:
        log.info(f"DSN con service name: {dsn}")
        return dsn

    # Descriptor completo ya armado
    if dsn.upper().startswith("(DESCRIPTION"):
        log.info("DSN con descriptor completo")
        return dsn

    # host:puerto:sid -> convertir
    partes = dsn.split(":")
    if len(partes) == 3:
        h, p, sid_ = partes
        dsn_final = oracledb.makedsn(h, int(p), sid=sid_)
        log.info(f"DSN convertido de host:puerto:SID -> descriptor "
                 f"({h}:{p} SID={sid_})")
        return dsn_final

    raise RuntimeError(
        f"No se pudo interpretar ORACLE_DSN='{dsn}'. Formatos validos:\n"
        f"  host:puerto/servicio   (service name)\n"
        f"  host:puerto:sid        (SID)\n"
        f"  o define ORACLE_HOST, ORACLE_PORT y ORACLE_SID por separado")


def fetch_from_oracle() -> list[dict]:
    iniciar_cliente_oracle()
    log.info("Conectando a Oracle...")
    with oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        dsn=construir_dsn(),
        tcp_connect_timeout=30,
    ) as conn:
        conn.call_timeout = 300_000  # 5 min max por query, en milisegundos
        with conn.cursor() as cur:
            # Bloquea cualquier escritura a nivel de base de datos.
            cur.execute(SOLO_LECTURA)
            log.info("  Sesion marcada READ ONLY (no puede escribir).")
            cur.execute(QUERY, fecha_inicio=calcular_fecha_inicio())
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


def verificar_conexiones() -> int:
    """
    Prueba ambas conexiones por separado y explica que revisar si falla.

    Un stacktrace de oracledb no le dice nada a quien esta diagnosticando
    a las 5 de la manana: mejor un mensaje que apunte al problema concreto.
    """
    faltantes = [v for v in ("ORACLE_USER", "ORACLE_PASSWORD",
                             "SUPABASE_URL", "SUPABASE_SERVICE_KEY")
                 if not os.environ.get(v)]
    if not os.environ.get("ORACLE_DSN") and not (
            os.environ.get("ORACLE_HOST") and os.environ.get("ORACLE_SID")):
        faltantes.append("ORACLE_DSN (o ORACLE_HOST + ORACLE_SID)")
    if faltantes:
        log.error("Faltan variables de entorno: " + ", ".join(faltantes))
        log.error("Revisa que el archivo .env exista y este completo.")
        return 1

    ok = True

    log.info("Verificando Oracle...")
    try:
        iniciar_cliente_oracle()
        with oracledb.connect(
            user=os.environ["ORACLE_USER"],
            password=os.environ["ORACLE_PASSWORD"],
            dsn=construir_dsn(),
            tcp_connect_timeout=15,
        ) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM DUAL")
                cur.fetchone()
                # Confirmar que el usuario si puede leer las tablas del reporte
                cur.execute("SELECT COUNT(*) FROM VTATD_COTIZACION "
                            "WHERE ROWNUM <= 1")
                cur.fetchone()
                log.info("  Oracle OK — conecta y puede leer VTATD_COTIZACION")

                # Confirmar que la proteccion de escritura si funciona.
                # Se intenta un UPDATE que no afecta ninguna fila; lo que
                # importa es que Oracle lo rechace por ser sesion READ ONLY.
                cur.execute(SOLO_LECTURA)
                try:
                    cur.execute("UPDATE VTATD_COTIZACION SET STATUS = STATUS "
                                "WHERE 1 = 0")
                    log.error("  ATENCION: la sesion SI pudo ejecutar un UPDATE.")
                    log.error("  La proteccion de solo lectura NO esta funcionando.")
                    return 1
                except Exception as e:
                    if "ORA-01456" in str(e):
                        log.info("  Proteccion OK — la sesion rechaza escrituras "
                                 "(ORA-01456)")
                    else:
                        log.warning(f"  El UPDATE fallo por otra razon: "
                                    f"{str(e).splitlines()[0]}")
                        log.warning("  Revisa manualmente que no pueda escribir.")
    except Exception as exc:
        ok = False
        msg = str(exc)
        log.error(f"  Oracle FALLO: {msg.splitlines()[0]}")
        if "DPY-3010" in msg:
            log.error("  -> Esta base es Oracle 11g y el modo thin no la")
            log.error("     soporta. Falta definir ORACLE_CLIENT_DIR en el")
            log.error("     .env, apuntando al Oracle Instant Client 19c.")
        elif "DPY-6005" in msg or "timed out" in msg:
            if not os.environ.get("ORACLE_CLIENT_DIR"):
                log.error("  -> Falta ORACLE_CLIENT_DIR en el .env.")
                log.error("     Esta base es Oracle 11g y el modo thin de")
                log.error("     python-oracledb solo sirve con 12.1 o mayor.")
            else:
                log.error("  -> No hay ruta al servidor. Revisa host y puerto")
                log.error("     de ORACLE_DSN, y que se alcance esa red.")
        elif "ORA-01017" in msg:
            log.error("  -> Usuario o contrasena incorrectos.")
        elif "ORA-12514" in msg or "ORA-12154" in msg:
            log.error("  -> El service name del DSN no existe. Formato:")
            log.error("     host:puerto/service_name")
        elif "DPY-4027" in msg:
            log.error("  -> El DSN no se pudo interpretar. Si tu conexion usa")
            log.error("     SID, el formato host:puerto:sid NO lo entiende")
            log.error("     python-oracledb: usa ORACLE_HOST, ORACLE_PORT y")
            log.error("     ORACLE_SID por separado en el .env.")
        elif "ORA-00942" in msg:
            log.error("  -> El usuario conecta pero NO tiene permiso de lectura.")
            log.error("     Falta correr los GRANT de 01_oracle_readonly_user.sql")

    log.info("Verificando Supabase...")
    try:
        c = create_client(os.environ["SUPABASE_URL"],
                          os.environ["SUPABASE_SERVICE_KEY"])
        c.table("etl_status").select("id").limit(1).execute()
        c.table("reporte_tiempos_zona_mes").select("id").limit(1).execute()
        log.info("  Supabase OK — conecta y ve las dos tablas")
    except Exception as exc:
        ok = False
        msg = str(exc)
        log.error(f"  Supabase FALLO: {msg.splitlines()[0]}")
        if "Invalid API key" in msg or "JWT" in msg:
            log.error("  -> La SUPABASE_SERVICE_KEY es incorrecta. Debe ser la")
            log.error("     service_role, no la anon.")
        elif "does not exist" in msg or "42P01" in msg:
            log.error("  -> Faltan tablas. Corre 02_supabase_schema.sql y")
            log.error("     06_migracion_v2_etapas.sql en el SQL Editor.")

    if ok:
        log.info("Ambas conexiones responden correctamente.")
        return 0
    return 1


def resumen_datos(rows: list[dict]) -> None:
    """Imprime un resumen de lo que se traeria, sin escribir nada."""
    if not rows:
        log.warning("Oracle no devolvio filas.")
        return

    total = sum(r.get("total") or 0 for r in rows)
    meses = sorted({r["anio_mes"] for r in rows})
    zonas = sorted({r["zona"] for r in rows})

    log.info("-" * 58)
    log.info(f"  Filas (zona x mes) : {len(rows)}")
    log.info(f"  Entregas totales   : {total:,}")
    log.info(f"  Meses              : {len(meses)}  ({meses[0]} a {meses[-1]})")
    log.info(f"  Zonas              : {len(zonas)}")

    # Mediana global ponderada por volumen
    if total:
        med = sum((r.get("mediana_dias") or 0) * (r.get("total") or 0)
                  for r in rows) / total
        log.info(f"  Mediana ponderada  : {med:.2f} dias")

    # Columnas que vengan completamente vacias: sintoma de un problema
    # en la query o en los permisos del usuario de Oracle.
    vacias = [c for c in rows[0]
              if all(r.get(c) is None for r in rows)]
    if vacias:
        log.warning(f"  Columnas SIN DATOS : {', '.join(vacias)}")
    else:
        log.info("  Columnas sin datos : ninguna")

    log.info("-" * 58)
    log.info("Primera fila de ejemplo:")
    for k, v in rows[0].items():
        log.info(f"    {k:30s} = {v}")
    log.info("-" * 58)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="ETL de tiempos de entrega: Oracle -> Supabase")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Consulta Oracle y muestra un resumen SIN escribir en Supabase. "
             "Usalo para validar la conexion y los datos en la primera corrida.")
    parser.add_argument(
        "--check", action="store_true",
        help="Solo verifica que ambas conexiones respondan y termina.")
    args = parser.parse_args()

    inicio = time.time()
    client = None
    try:
        # --check: probar las dos conexiones y salir
        if args.check:
            return verificar_conexiones()

        rows = fetch_from_oracle()

        # --dry-run: mostrar que se traeria y salir sin escribir
        if args.dry_run:
            resumen_datos(rows)
            log.info("MODO PRUEBA: no se escribio nada en Supabase.")
            return 0

        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )

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