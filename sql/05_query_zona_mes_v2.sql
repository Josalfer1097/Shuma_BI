-- ============================================================
-- Query v2 — Tiempos por ETAPA, no solo el ciclo completo
--
-- Cambios respecto a v1:
--  + Se agregan las 6 etapas del proceso medidas por separado,
--    incluyendo AUTORIZACION, que antes no se media.
--  + Se agrega el desglose de que tipo de autorizacion se pidio
--    (lista de precios / CXC / descuentos).
--  + Se agrega el tiempo de entrega -> facturacion.
--  - Se ELIMINA "facturas fuera de rango". Medido sobre datos reales,
--    el 72.7% cae "fuera" porque en Shuma se factura por lote al cierre
--    del dia, despues de la entrega. No era una falla del proceso, era
--    la practica normal, asi que el indicador era un falso positivo.
--
-- Nota sobre MEDIAN y NULL: Oracle ignora los NULL al calcular MEDIAN,
-- que es el comportamiento correcto aqui (una cotizacion sin cierta
-- fecha simplemente no participa en la mediana de ese tramo).
-- ============================================================

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
