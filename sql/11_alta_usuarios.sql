-- ============================================================
-- 11 - Alta de usuarios
--
--   Josue Ferreira    direccion   ve todo
--   Gustavo Gonzalez  direccion   ve todo
--   Cesar Cruz        restringido solo CFS
--
-- es_direccion salta la tabla de permisos entera: los de
-- direccion no necesitan filas por area, ni ahora ni cuando
-- entren CXC, Ventas o Contabilidad.
--
-- Correr los bloques UNO POR UNO.
-- ============================================================


-- ---------- BLOQUE 1: Josue a direccion ----------

UPDATE public.perfiles
SET    es_direccion = true
WHERE  id = '2397dc4a-7dc1-44db-89ac-f29888121beb';


-- ---------- BLOQUE 2: crear los dos usuarios nuevos ----------
-- Esto NO es SQL. En el tablero de Supabase, dos veces:
--   Authentication > Users > Add user > Create new user
--   Marcar "Auto Confirm User" en ambos.
--
--   gustavo.gonzalez@shuma.com.mx    contrasena temporal
--   cesar.cruz@shuma.mx              contrasena temporal
--
-- Copiar los dos User UID de la lista.


-- ---------- BLOQUE 3: perfiles de Gustavo y Cesar ----------
-- Sustituir UUID_GUSTAVO y UUID_CESAR.
--
-- ON CONFLICT para que reejecutarlo no reviente con
-- "duplicate key violates perfiles_pkey".

INSERT INTO public.perfiles (id, nombre, correo, es_direccion)
VALUES
    ('UUID_GUSTAVO', 'Gustavo González', 'gustavo.gonzalez@shuma.com.mx', true),
    ('UUID_CESAR',   'César Cruz',       'cesar.cruz@shuma.mx',           false)
ON CONFLICT (id) DO UPDATE
SET nombre       = EXCLUDED.nombre,
    correo       = EXCLUDED.correo,
    es_direccion = EXCLUDED.es_direccion;


-- ---------- BLOQUE 4: permisos de Cesar ----------
-- Solo Cesar lleva filas aqui: los de direccion no las necesitan.
-- Una fila por cada area de CFS que deba ver. Hoy solo logistica
-- tiene datos; las demas se agregan cuando existan.

INSERT INTO public.permisos (perfil_id, empresa, area)
VALUES
    ('UUID_CESAR', 'cfs', 'logistica')
ON CONFLICT (perfil_id, empresa, area) DO NOTHING;


-- ---------- BLOQUE 5: verificar los tres perfiles ----------
-- Esperado:
--   Cesar Cruz         false   1 fila de permisos
--   Gustavo González   true    0 filas
--   Josue Ferreira     true    1 fila (la vieja de cfs/logistica,
--                               ya irrelevante porque es direccion)

SELECT
    pf.nombre,
    pf.correo,
    pf.es_direccion,
    pf.activo,
    COUNT(pm.id) AS filas_permisos
FROM
    public.perfiles AS pf
    LEFT JOIN public.permisos AS pm
      ON pm.perfil_id = pf.id
GROUP BY
    pf.nombre,
    pf.correo,
    pf.es_direccion,
    pf.activo
ORDER BY
    pf.nombre;


-- ---------- BLOQUE 6: probar a Gustavo ----------
-- Sustituir UUID_GUSTAVO. Correr el bloque COMPLETO de una vez.
-- Esperado: las cuatro en true, incluidas areas que aun no existen.

BEGIN;

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"UUID_GUSTAVO","role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

SELECT
    public.tiene_acceso('cfs', 'logistica')      AS cfs_logistica,
    public.tiene_acceso('acabados', 'logistica') AS ash_logistica,
    public.tiene_acceso('cfs', 'contabilidad')   AS cfs_contabilidad,
    public.tiene_acceso('acabados', 'ventas')    AS ash_ventas;

ROLLBACK;


-- ---------- BLOQUE 7: probar a Cesar ----------
-- Sustituir UUID_CESAR. Correr el bloque COMPLETO de una vez.
-- Esperado: solo cfs_logistica en true, las otras tres en false.
--
-- Este es el bloque que importa: es el unico que comprueba que el
-- filtro discrimina. Con Josue y Gustavo en direccion, Cesar es
-- ahora el unico perfil que puede demostrarlo.

BEGIN;

SELECT set_config(
    'request.jwt.claims',
    '{"sub":"UUID_CESAR","role":"authenticated"}',
    true
);

SET LOCAL ROLE authenticated;

SELECT
    public.tiene_acceso('cfs', 'logistica')      AS cfs_logistica,
    public.tiene_acceso('acabados', 'logistica') AS ash_logistica,
    public.tiene_acceso('cfs', 'cxc')            AS cfs_cxc,
    public.tiene_acceso('acabados', 'cxc')       AS ash_cxc;

ROLLBACK;


-- ============================================================
-- LIMPIEZA OPCIONAL
--
-- Josue conserva la fila cfs/logistica de las pruebas. No estorba
-- (es_direccion se evalua primero), pero deja el modelo mas limpio
-- si los de direccion no tienen permisos sueltos.
-- ============================================================

-- DELETE FROM public.permisos
-- WHERE  perfil_id = '2397dc4a-7dc1-44db-89ac-f29888121beb';
