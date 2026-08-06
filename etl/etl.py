import os
import sys
import time
import logging
import argparse
from datetime import datetime, date, timezone

import oracledb
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("etl")

MESES_HISTORIA = int(os.environ.get("ETL_MESES_HISTORIA", "25"))
ETL_DIAS_DORMANCIA = int(os.environ.get("ETL_DIAS_DORMANCIA", "30"))


def calcular_fecha_inicio() -> str:
    """Devuelve la fecha de corte inferior en formato YYYY-MM-DD."""
    fijo = os.environ.get("ETL_FECHA_INICIO")
    if fijo:
        log.info(f"Usando fecha de inicio fija: {fijo}")
        return fijo

    hoy = date.today()
    total = hoy.year * 12 + (hoy.month - 1) - MESES_HISTORIA
    inicio = date(total // 12, total % 12 + 1, 1)
    log.info(f"Ventana movil de {MESES_HISTORIA} meses: desde {inicio}")
    return inicio.isoformat()


MIN_FILAS_ESPERADAS = int(os.environ.get("ETL_MIN_FILAS", "10"))

SOLO_LECTURA = "SET TRANSACTION READ ONLY"

_cliente_iniciado = False


def iniciar_cliente_oracle() -> None:
    """Inicializa el modo thick. Idempotente: init_oracle_client() no admite
    mas de una llamada por proceso."""
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


ORIGEN_Y_FILTROS = """
FROM VTATD_COTIZACION COT
         INNER JOIN LOGTR_RECEPCION LR ON (COT.ID_COTIZACION = LR.ID_COTIZACION)
         INNER JOIN VTATC_STATUS_COTIZACION STC ON (COT.STATUS = STC.CLAVE)
         LEFT JOIN WFLTD_DOCUMENTO WFL ON (COT.ID_WFL_DOCUMENTO = WFL.ID_WFL_DOCUMENTO)
         LEFT JOIN COBTR_DIRECCION DIRFIS ON (COT.ID_DIRECCION_FISCAL = DIRFIS.ID_DIRECCION)
         LEFT JOIN COBTR_DIRECCION DIRENT ON (COT.ID_DIRECCION_ENTREGA = DIRENT.ID_DIRECCION)
         LEFT JOIN UTITC_ZONA ZONAFIS ON (DIRFIS.ID_ZONA = ZONAFIS.ID_ZONA)
         LEFT JOIN UTITC_ZONA ZONAENT ON (DIRENT.ID_ZONA = ZONAENT.ID_ZONA)
         -- Cadena cotizacion -> factura. No hay FK directo; esta ruta de
         -- cuatro saltos usa indices en los cuatro. La alternativa era
         -- parsear el CSV de COT.NUMEROS_FACTURAS, sin indices y con el
         -- folio partido en SERIE_FACTURA || NUMERO_FACTURA.
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
  -- Descarta cierres masivos por lote: ~6,552 registros con entrega y
  -- validacion identicas al segundo, concentrados en dos fechas. Inflaban
  -- el maximo a 3,745 dias.
  AND LR.FECHA_ENTREGADO <> LR.FECHA_VALIDADO
  AND LR.FECHA_RUTA >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')
  AND LR.FECHA_RUTA <  TRUNC(SYSDATE)   -- corte en D-1: el dia en curso esta abierto
"""

QUERY = f"""
SELECT
    TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM')                               AS ANIO_MES,
    COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')  AS ZONA,
    COUNT(*)                                                         AS TOTAL,

    -- Ciclo completo: cotizacion -> validacion de entrega
    ROUND(AVG(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS PROMEDIO_DIAS,
    ROUND(MEDIAN(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)       AS MEDIANA_DIAS,
    ROUND(MAX(LR.FECHA_VALIDADO - COT.FECHA_COTIZACION), 2)          AS MAXIMO_DIAS,

    -- Desglose por etapa, en orden del proceso
    ROUND(MEDIAN(WFL.FECHA_END        - COT.FECHA_COTIZACION), 3)    AS MED_COT_AUTORIZACION,
    ROUND(MEDIAN(LR.FECHA_RECEPCION   - WFL.FECHA_END), 3)           AS MED_AUTORIZACION_RECEPCION,
    ROUND(MEDIAN(LR.FECHA_SURTIDO     - LR.FECHA_RECEPCION), 3)      AS MED_RECEPCION_SURTIDO,
    ROUND(MEDIAN(LR.FECHA_RUTA        - LR.FECHA_SURTIDO), 3)        AS MED_SURTIDO_RUTA,
    ROUND(MEDIAN(LR.FECHA_ENTREGADO   - LR.FECHA_RUTA), 3)           AS MED_RUTA_ENTREGA,
    ROUND(MEDIAN(LR.FECHA_VALIDADO    - LR.FECHA_ENTREGADO), 3)      AS MED_ENTREGA_VALIDACION,

    -- Facturacion. El signo suele ser negativo: el material sale con
    -- remision y se factura por lote al cierre del dia, despues de entregar.
    COUNT(FACT.FECHA_PRIMERA_FACTURA)                                AS TOTAL_CON_FACTURA,
    ROUND(MEDIAN(FACT.FECHA_PRIMERA_FACTURA - LR.FECHA_ENTREGADO),3) AS MED_ENTREGA_FACTURA,

    -- Tipo de autorizacion solicitada. No son mutuamente excluyentes:
    -- la suma de las tres puede superar TOTAL.
    SUM(CASE WHEN WFL.FECHA_B1 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_LISTA,
    SUM(CASE WHEN WFL.FECHA_B2 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_CXC,
    SUM(CASE WHEN WFL.FECHA_B3 IS NOT NULL THEN 1 ELSE 0 END)        AS CON_AUTORIZ_DESCUENTOS

{ORIGEN_Y_FILTROS}
  -- Excluye cotizaciones dormidas: el tiempo de decision del cliente
  -- distorsiona la metrica operativa, cuya meta es de 5 dias.
  AND LR.FECHA_RUTA - COT.FECHA_COTIZACION <= :dias_dormancia

GROUP BY TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM'),
         COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')
ORDER BY ANIO_MES, ZONA
"""

QUERY_EXCLUSIONES = f"""
SELECT
    TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM')                               AS ANIO_MES,
    COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')  AS ZONA,
    COUNT(*)                                                         AS EXCLUIDAS_DORMANCIA

{ORIGEN_Y_FILTROS}
  -- Cuenta cotizaciones dormidas (fuera del tiempo de decision normal)
  AND LR.FECHA_RUTA - COT.FECHA_COTIZACION > :dias_dormancia

GROUP BY TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM'),
         COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')
ORDER BY ANIO_MES, ZONA
"""


def construir_dsn(empresa: str) -> str:
    """
    Normaliza el DSN de Oracle a un formato que python-oracledb acepte.

    Solo el formato corto con service name (host:puerto/servicio) se pasa
    tal cual. Con SID hay que construir el descriptor con makedsn(): el
    formato host:puerto:sid que usan JDBC y cx_Oracle no se reconoce, se
    interpreta como alias de tnsnames.ora y falla con DPY-4027.
    """
    emp = empresa.upper()
    host = os.environ.get(f"ORACLE_{emp}_HOST")
    sid = os.environ.get(f"ORACLE_{emp}_SID")
    if host and sid:
        port = int(os.environ.get(f"ORACLE_{emp}_PORT", "1521"))
        dsn = oracledb.makedsn(host, port, sid=sid)
        log.info(f"[{empresa}] DSN armado con SID: {host}:{port} SID={sid}")
        return dsn

    dsn = os.environ.get(f"ORACLE_{emp}_DSN", "").strip()
    if not dsn:
        raise RuntimeError(
            f"Falta ORACLE_{emp}_DSN (o ORACLE_{emp}_HOST + ORACLE_{emp}_SID) en el .env")

    if "/" in dsn:
        log.info(f"[{empresa}] DSN con service name: {dsn}")
        return dsn

    if dsn.upper().startswith("(DESCRIPTION"):
        log.info(f"[{empresa}] DSN con descriptor completo")
        return dsn

    partes = dsn.split(":")
    if len(partes) == 3:
        h, p, sid_ = partes
        dsn_final = oracledb.makedsn(h, int(p), sid=sid_)
        log.info(f"[{empresa}] DSN convertido de host:puerto:SID -> descriptor "
                 f"({h}:{p} SID={sid_})")
        return dsn_final

    raise RuntimeError(
        f"No se pudo interpretar ORACLE_{emp}_DSN='{dsn}'. Formatos validos:\n"
        f"  host:puerto/servicio   (service name)\n"
        f"  host:puerto:sid        (SID)\n"
        f"  o define ORACLE_{emp}_HOST, ORACLE_{emp}_PORT y ORACLE_{emp}_SID por separado")


def fetch_from_oracle(empresa: str) -> list[dict]:
    """Ejecuta el query agregado y devuelve las filas como dicts, sumando las exclusiones."""
    emp = empresa.upper()
    iniciar_cliente_oracle()
    log.info(f"[{empresa}] Conectando a Oracle...")
    with oracledb.connect(
        user=os.environ[f"ORACLE_{emp}_USER"],
        password=os.environ[f"ORACLE_{emp}_PASSWORD"],
        dsn=construir_dsn(empresa),
        tcp_connect_timeout=30,
    ) as conn:
        conn.call_timeout = 300_000  # ms
        with conn.cursor() as cur:
            cur.execute(SOLO_LECTURA)
            log.info(f"[{empresa}]   Sesion marcada READ ONLY (no puede escribir).")
            
            fecha_ini = calcular_fecha_inicio()

            # 1. Query principal
            cur.execute(QUERY, fecha_inicio=fecha_ini, dias_dormancia=ETL_DIAS_DORMANCIA)
            cols = [c[0].lower() for c in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]

            # 2. Query de exclusiones
            cur.execute(QUERY_EXCLUSIONES, fecha_inicio=fecha_ini, dias_dormancia=ETL_DIAS_DORMANCIA)
            cols_ex = [c[0].lower() for c in cur.description]
            excl_rows = [dict(zip(cols_ex, row)) for row in cur.fetchall()]

    # Unir resultados
    map_excl = {(r["anio_mes"], r["zona"]): r["excluidas_dormancia"] for r in excl_rows}

    for r in rows:
        r["empresa"] = empresa
        r["excluidas_dormancia"] = map_excl.get((r["anio_mes"], r["zona"]), 0)

    log.info(f"[{empresa}] Oracle devolvio {len(rows)} filas (zona x mes).")
    return rows


def push_to_supabase(client, rows: list[dict]) -> None:
    """
    Publica el resultado con UPSERT sobre la restriccion unique
    (empresa, anio_mes, zona).

    No se usa DELETE + INSERT: un fallo entre ambos pasos deja la tabla
    vacia y el tablero en blanco hasta la corrida siguiente.
    """
    if not rows:
        return
        
    empresa = rows[0]["empresa"]
    ahora = datetime.now(timezone.utc).isoformat()
    for r in rows:
        r["actualizado_en"] = ahora

    CHUNK = 100
    for i in range(0, len(rows), CHUNK):
        lote = rows[i:i + CHUNK]
        client.table("reporte_tiempos_zona_mes").upsert(
            lote, on_conflict="empresa,anio_mes,zona"
        ).execute()
        log.info(f"[{empresa}]   Upsert {min(i + CHUNK, len(rows))}/{len(rows)}")

    log.info(f"[{empresa}] Tabla reporte_tiempos_zona_mes actualizada.")


def limpiar_obsoletos(client, rows: list[dict], empresa: str) -> int:
    """
    Purga las combinaciones zona x mes que ya no existen en el origen.
    Limitado unicamente a la empresa en proceso. Pagina de a 1,000.
    """
    vigentes = {(r["anio_mes"], r["zona"]) for r in rows}
    existentes = []
    
    LIMIT = 1000
    offset = 0
    while True:
        res = client.table("reporte_tiempos_zona_mes") \
            .select("id, anio_mes, zona") \
            .eq("empresa", empresa) \
            .range(offset, offset + LIMIT - 1) \
            .execute()
        
        data = res.data or []
        existentes.extend(data)
        if len(data) < LIMIT:
            break
        offset += LIMIT

    obsoletos = [e["id"] for e in existentes
                 if (e["anio_mes"], e["zona"]) not in vigentes]

    if obsoletos:
        log.info(f"[{empresa}] Eliminando {len(obsoletos)} filas obsoletas...")
        CHUNK = 1000
        for i in range(0, len(obsoletos), CHUNK):
            lote = obsoletos[i:i + CHUNK]
            client.table("reporte_tiempos_zona_mes") \
                .delete().eq("empresa", empresa).in_("id", lote).execute()
            
    return len(obsoletos)


def actualizar_status(client, filas: int, duracion: float,
                      estado: str, empresa: str, error: str = None) -> None:
    """Registra el resultado de la corrida en etl_status haciendo upsert por empresa."""
    client.table("etl_status").upsert({
        "empresa": empresa,
        "ultima_corrida": datetime.now(timezone.utc).isoformat(),
        "fecha_corte": date.today().isoformat(),
        "filas_procesadas": filas,
        "duracion_segundos": round(duracion, 2),
        "estado": estado,
        "mensaje_error": error,
    }, on_conflict="empresa").execute()


def verificar_conexiones(empresa: str) -> int:
    """
    Diagnostico de --check: valida entorno, Oracle y Supabase por separado.
    Return: 0 si ambas conexiones responden, 1 en cualquier otro caso.
    """
    emp = empresa.upper()
    faltantes = [v for v in (f"ORACLE_{emp}_USER", f"ORACLE_{emp}_PASSWORD",
                             "SUPABASE_URL", "SUPABASE_SERVICE_KEY")
                 if not os.environ.get(v)]
    if not os.environ.get(f"ORACLE_{emp}_DSN") and not (
            os.environ.get(f"ORACLE_{emp}_HOST") and os.environ.get(f"ORACLE_{emp}_SID")):
        faltantes.append(f"ORACLE_{emp}_DSN (o ORACLE_{emp}_HOST + ORACLE_{emp}_SID)")
    if faltantes:
        log.error(f"[{empresa}] Faltan variables de entorno: " + ", ".join(faltantes))
        log.error(f"[{empresa}] Revisa que el archivo .env exista y este completo para esta empresa.")
        return 1

    ok = True

    log.info(f"[{empresa}] Verificando Oracle...")
    try:
        iniciar_cliente_oracle()
        with oracledb.connect(
            user=os.environ[f"ORACLE_{emp}_USER"],
            password=os.environ[f"ORACLE_{emp}_PASSWORD"],
            dsn=construir_dsn(empresa),
            tcp_connect_timeout=15,
        ) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM DUAL")
                cur.fetchone()
                cur.execute("SELECT COUNT(*) FROM VTATD_COTIZACION "
                            "WHERE ROWNUM <= 1")
                cur.fetchone()
                log.info(f"[{empresa}]   Oracle OK — conecta y puede leer VTATD_COTIZACION")

                cur.execute(SOLO_LECTURA)
                try:
                    cur.execute("UPDATE VTATD_COTIZACION SET STATUS = STATUS "
                                "WHERE 1 = 0")
                    log.error(f"[{empresa}]   ATENCION: la sesion SI pudo ejecutar un UPDATE.")
                    log.error(f"[{empresa}]   La proteccion de solo lectura NO esta funcionando.")
                    return 1
                except Exception as e:
                    if "ORA-01456" in str(e):
                        log.info(f"[{empresa}]   Proteccion OK — la sesion rechaza escrituras "
                                 "(ORA-01456)")
                    else:
                        log.warning(f"[{empresa}]   El UPDATE fallo por otra razon: "
                                    f"{str(e).splitlines()[0]}")
                        log.warning(f"[{empresa}]   Revisa manualmente que no pueda escribir.")
    except Exception as exc:
        ok = False
        msg = str(exc)
        log.error(f"[{empresa}]   Oracle FALLO: {msg.splitlines()[0]}")
        if "DPY-3010" in msg:
            log.error(f"[{empresa}]   -> Esta base es Oracle 11g y el modo thin no la")
            log.error(f"[{empresa}]      soporta. Falta definir ORACLE_CLIENT_DIR en el")
            log.error(f"[{empresa}]      .env, apuntando al Oracle Instant Client 19c.")
        elif "DPY-6005" in msg or "timed out" in msg:
            if not os.environ.get("ORACLE_CLIENT_DIR"):
                log.error(f"[{empresa}]   -> Falta ORACLE_CLIENT_DIR en el .env.")
                log.error(f"[{empresa}]      Esta base es Oracle 11g y el modo thin de")
                log.error(f"[{empresa}]      python-oracledb solo sirve con 12.1 o mayor.")
            else:
                log.error(f"[{empresa}]   -> No hay ruta al servidor. Revisa host y puerto")
                log.error(f"[{empresa}]      de ORACLE_{emp}_DSN, y que se alcance esa red.")
        elif "ORA-01017" in msg:
            log.error(f"[{empresa}]   -> Usuario o contrasena incorrectos.")
        elif "ORA-28009" in msg:
            log.error(f"[{empresa}]   -> ORACLE_{emp}_USER esta puesto como SYS. Usa el usuario")
            log.error(f"[{empresa}]      de la aplicacion (ETL_DASHBOARD), no una cuenta")
            log.error(f"[{empresa}]      administrativa.")
        elif "ORA-12514" in msg or "ORA-12154" in msg:
            log.error(f"[{empresa}]   -> El service name del DSN no existe. Formato:")
            log.error(f"[{empresa}]      host:puerto/service_name")
        elif "DPY-4027" in msg:
            log.error(f"[{empresa}]   -> El DSN no se pudo interpretar. Si tu conexion usa")
            log.error(f"[{empresa}]      SID, el formato host:puerto:sid NO lo entiende")
            log.error(f"[{empresa}]      python-oracledb: usa HOST, PORT y SID por separado.")
        elif "ORA-00942" in msg:
            log.error(f"[{empresa}]   -> El usuario conecta pero NO tiene permiso de lectura.")
            log.error(f"[{empresa}]      Falta correr los GRANT de 01_oracle_readonly_user.sql")

    log.info(f"[{empresa}] Verificando Supabase...")
    try:
        c = create_client(os.environ["SUPABASE_URL"],
                          os.environ["SUPABASE_SERVICE_KEY"])
        c.table("etl_status").select("empresa").limit(1).execute()
        c.table("reporte_tiempos_zona_mes").select("empresa").limit(1).execute()
        log.info(f"[{empresa}]   Supabase OK — conecta y ve las dos tablas")
    except Exception as exc:
        ok = False
        msg = str(exc)
        log.error(f"[{empresa}]   Supabase FALLO: {msg.splitlines()[0]}")
        if "Invalid API key" in msg or "JWT" in msg:
            log.error(f"[{empresa}]   -> La SUPABASE_SERVICE_KEY es incorrecta. Debe ser la")
            log.error(f"[{empresa}]      service_role, no la anon.")
        elif "does not exist" in msg or "42P01" in msg:
            log.error(f"[{empresa}]   -> Faltan tablas o falta correr la migracion.")
            log.error(f"[{empresa}]      Revisa el esquema en Supabase.")

    if ok:
        log.info(f"[{empresa}] Ambas conexiones responden correctamente.")
        return 0
    return 1


def resumen_datos(rows: list[dict], empresa: str) -> None:
    """Reporte de --dry-run: volumetria, dormancia y primera fila, sin escribir."""
    if not rows:
        log.warning(f"[{empresa}] Oracle no devolvio filas.")
        return

    total = sum(r.get("total") or 0 for r in rows)
    excluidas = sum(r.get("excluidas_dormancia") or 0 for r in rows)
    total_general = total + excluidas
    porcentaje_excl = (excluidas / total_general * 100) if total_general else 0
    
    meses = sorted({r["anio_mes"] for r in rows})
    zonas = sorted({r["zona"] for r in rows})

    log.info("-" * 58)
    log.info(f"  Empresa            : {empresa}")
    log.info(f"  Filas (zona x mes) : {len(rows)}")
    log.info(f"  Entregas validas   : {total:,}")
    log.info(f"  Excluidas dormancia: {excluidas:,} ({porcentaje_excl:.1f}% del total general)")
    log.info(f"  Meses              : {len(meses)}  ({meses[0]} a {meses[-1]})")
    log.info(f"  Zonas              : {len(zonas)}")

    if total:
        med = sum((r.get("mediana_dias") or 0) * (r.get("total") or 0)
                  for r in rows) / total
        log.info(f"  Mediana ponderada  : {med:.2f} dias")

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
        "--empresa", required=False,
        help="Identificador de la empresa (ej. cfs, acabados)")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Consulta Oracle y muestra un resumen SIN escribir en Supabase. "
             "Usalo para validar la conexion y los datos en la primera corrida.")
    parser.add_argument(
        "--check", action="store_true",
        help="Solo verifica que ambas conexiones respondan y termina.")
    args = parser.parse_args()

    # Validar empresa requerida
    empresas_conf = [e.strip().lower() for e in os.environ.get("ETL_EMPRESAS", "").split(",") if e.strip()]
    if not args.empresa or args.empresa.lower() not in empresas_conf:
        log.error("Falta el argumento obligatorio --empresa o su valor no esta en ETL_EMPRESAS.")
        log.error(f"Empresas configuradas en .env (ETL_EMPRESAS): {', '.join(empresas_conf) if empresas_conf else 'NINGUNA'}")
        log.error("Ejemplo: python etl.py --empresa cfs")
        return 1

    empresa = args.empresa.lower()

    inicio = time.time()
    client = None
    try:
        if args.check:
            return verificar_conexiones(empresa)

        rows = fetch_from_oracle(empresa)

        if args.dry_run:
            resumen_datos(rows, empresa)
            log.info(f"[{empresa}] MODO PRUEBA: no se escribio nada en Supabase.")
            return 0

        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )

        if len(rows) < MIN_FILAS_ESPERADAS:
            raise RuntimeError(
                f"Oracle devolvio solo {len(rows)} filas, menos del minimo "
                f"esperado ({MIN_FILAS_ESPERADAS}). Se aborta sin tocar "
                f"Supabase para no dejar el tablero incompleto."
            )

        push_to_supabase(client, rows)
        eliminadas = limpiar_obsoletos(client, rows, empresa)

        duracion = time.time() - inicio
        actualizar_status(client, len(rows), duracion, "OK", empresa)
        log.info(
            f"[{empresa}] ETL completado en {duracion:.1f}s. "
            f"Filas: {len(rows)}, obsoletas eliminadas: {eliminadas}"
        )
        return 0

    except Exception as exc:
        duracion = time.time() - inicio
        log.exception(f"[{empresa}] ETL fallo")

        if client is not None:
            try:
                actualizar_status(client, 0, duracion, "ERROR", empresa, str(exc)[:500])
            except Exception:
                log.exception(f"[{empresa}] Tampoco se pudo registrar el error en etl_status")
        return 1


if __name__ == "__main__":
    sys.exit(main())