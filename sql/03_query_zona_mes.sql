-- ============================================================
-- Query de tiempos de entrega por Zona x Año-Mes, con validacion
-- de fecha de factura (debe caer entre surtido y ruta).
--
-- Esta es EXACTAMENTE la misma query que corre etl.py cada noche.
-- Prueba aqui primero cualquier cambio antes de tocar el script.
--
-- Nota: el "TO_DATE(:fecha_inicio, ...)" y el bind de arriba son
-- para el driver de Python. Para correrla tal cual en DataGrip,
-- ya viene resuelta abajo con el valor fijo '2025-01-01'.
-- ============================================================

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
  AND LR.FECHA_ENTREGADO <> LR.FECHA_VALIDADO         -- excluye cierres masivos por lote
  AND LR.FECHA_RUTA >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
  AND LR.FECHA_RUTA <  TRUNC(SYSDATE)                  -- corte en D-1, nunca el dia de hoy a medias

GROUP BY TO_CHAR(LR.FECHA_RUTA, 'YYYY-MM'),
         COALESCE(ZONAENT.DESCRIPCION, ZONAFIS.DESCRIPCION, 'SIN ZONA')
ORDER BY ANIO_MES, ZONA;
