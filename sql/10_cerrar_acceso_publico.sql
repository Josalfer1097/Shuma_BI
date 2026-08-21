-- ============================================================
-- 10 - Cerrar el acceso publico
-- Fase 4. Correr SOLO despues de verificar el login en preview.
-- A partir de aqui la anon key deja de devolver filas.
-- Correr los bloques UNO POR UNO.
-- ============================================================


-- ---------- BLOQUE 1: quitar las politicas abiertas ----------

DROP POLICY IF EXISTS "lectura publica reporte" ON public.reporte_tiempos_zona_mes;

DROP POLICY IF EXISTS "lectura publica etl_status" ON public.etl_status;


-- ---------- BLOQUE 2: politicas por permiso ----------

CREATE POLICY "lectura por permiso reporte"
    ON public.reporte_tiempos_zona_mes
    FOR SELECT
    TO authenticated
    USING (public.tiene_acceso(empresa, 'logistica'));

CREATE POLICY "lectura por permiso etl_status"
    ON public.etl_status
    FOR SELECT
    TO authenticated
    USING (public.tiene_acceso(empresa, 'logistica'));


-- ---------- BLOQUE 3: verificar que no quedo nada en public ----------
-- Esperado: ninguna fila con roles = {public}.

SELECT
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    p.qual
FROM
    pg_policies AS p
WHERE
    p.schemaname = 'public'
ORDER BY
    p.tablename,
    p.policyname;


-- ---------- BLOQUE 4: probar con la sesion de prueba ----------
-- Sustituir UUID_PRUEBA. Correr el bloque COMPLETO de una vez.
-- Con permiso solo sobre cfs/logistica:
--   filas_cfs > 0, filas_ash = 0.

BEGIN;

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"UUID_PRUEBA","role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

SELECT
    COUNT(*) FILTER (WHERE r.empresa = 'cfs')      AS filas_cfs,
    COUNT(*) FILTER (WHERE r.empresa = 'acabados') AS filas_ash
FROM
    public.reporte_tiempos_zona_mes AS r;

ROLLBACK;


-- ---------- BLOQUE 5: probar como anonimo ----------
-- Esperado: cero. Es la prueba de que la anon key del bundle publico
-- ya no sirve para leer datos de operacion.

BEGIN;

SET LOCAL ROLE anon;

SELECT
    COUNT(*) AS filas_visibles_anonimo
FROM
    public.reporte_tiempos_zona_mes AS r;

ROLLBACK;


-- ============================================================
-- REVERSA, por si algo sale mal en produccion.
-- Descomentar y correr para volver al estado abierto.
-- ============================================================

-- DROP POLICY IF EXISTS "lectura por permiso reporte" ON public.reporte_tiempos_zona_mes;
-- DROP POLICY IF EXISTS "lectura por permiso etl_status" ON public.etl_status;
--
-- CREATE POLICY "lectura publica reporte"
--     ON public.reporte_tiempos_zona_mes
--     FOR SELECT
--     USING (true);
--
-- CREATE POLICY "lectura publica etl_status"
--     ON public.etl_status
--     FOR SELECT
--     USING (true);
