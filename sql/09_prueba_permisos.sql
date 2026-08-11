-- ============================================================
-- 09 - Prueba de permisos
-- Verifica que tiene_acceso() responde bien ANTES de montar
-- el login. No cambia ninguna politica.
-- Correr los bloques UNO POR UNO.
-- ============================================================


-- ---------- BLOQUE 1: la funcion existe ----------

SELECT
    p.proname                        AS funcion,
    p.prosecdef                      AS security_definer,
    p.provolatile                    AS volatilidad,
    pg_get_function_arguments(p.oid) AS argumentos
FROM
    pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
WHERE
    n.nspname  = 'public'
    AND p.proname = 'tiene_acceso';


-- ---------- BLOQUE 2: crear usuario de prueba ----------
-- Esto NO es SQL. Hacerlo en el tablero de Supabase:
--   Authentication > Users > Add user > Create new user
--   Correo: prueba.cfs@gruposhuma.com
--   Marcar "Auto Confirm User"
-- Copiar el UUID que queda en la columna "User UID".


-- ---------- BLOQUE 3: alta del perfil ----------
-- Sustituir UUID_PRUEBA por el UUID del bloque 2.

INSERT INTO public.perfiles (id, nombre, correo, es_direccion)
VALUES (
    'UUID_PRUEBA',
    'Usuario de prueba CFS',
    'prueba.cfs@gruposhuma.com',
    false
);

INSERT INTO public.permisos (perfil_id, empresa, area)
VALUES
    ('UUID_PRUEBA', 'cfs', 'logistica');


-- ---------- BLOQUE 4: simular la sesion ----------
-- Correr el bloque COMPLETO de golpe, no linea por linea:
-- BEGIN y ROLLBACK tienen que ir en la misma transaccion.
-- Sustituir UUID_PRUEBA otra vez.
--
-- Esperado: cfs_logistica = true, el resto false.

BEGIN;

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"UUID_PRUEBA","role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

SELECT
    public.tiene_acceso('cfs', 'logistica')      AS cfs_logistica,
    public.tiene_acceso('acabados', 'logistica') AS ash_logistica,
    public.tiene_acceso('cfs', 'cxc')            AS cfs_cxc,
    public.tiene_acceso('acabados', 'cxc')       AS ash_cxc;

ROLLBACK;


-- ---------- BLOQUE 5: simular a direccion ----------
-- Convierte temporalmente al usuario en direccion y comprueba
-- que ve todo sin tener filas en permisos. El ROLLBACK deshace
-- el UPDATE, asi que el perfil queda como estaba.

BEGIN;

UPDATE public.perfiles
SET    es_direccion = true
WHERE  id = 'UUID_PRUEBA';

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"UUID_PRUEBA","role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

SELECT
    public.tiene_acceso('cfs', 'logistica')      AS cfs_logistica,
    public.tiene_acceso('acabados', 'logistica') AS ash_logistica,
    public.tiene_acceso('acabados', 'contabilidad') AS ash_contabilidad;

ROLLBACK;


-- ---------- BLOQUE 6: anonimo no pasa ----------
-- Esperado: las tres en false.

BEGIN;

SET LOCAL ROLE anon;

SELECT
    public.tiene_acceso('cfs', 'logistica')      AS cfs_logistica,
    public.tiene_acceso('acabados', 'logistica') AS ash_logistica,
    public.tiene_acceso('cfs', 'cxc')            AS cfs_cxc;

ROLLBACK;
