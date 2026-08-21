-- ============================================================
-- 08 - Perfiles y permisos
-- Fase 1: solo crea estructura. NO toca las politicas de las
-- tablas de datos, asi que el tablero sigue funcionando igual.
-- Correr los bloques UNO POR UNO en el editor de Supabase.
-- ============================================================


-- ---------- BLOQUE 1: tabla de perfiles ----------

CREATE TABLE IF NOT EXISTS public.perfiles (
    id             uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nombre         text        NOT NULL,
    correo         text        NOT NULL,
    es_direccion   boolean     NOT NULL DEFAULT false,
    activo         boolean     NOT NULL DEFAULT true,
    creado_en      timestamptz NOT NULL DEFAULT now()
);


-- ---------- BLOQUE 2: tabla de permisos ----------

CREATE TABLE IF NOT EXISTS public.permisos (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    perfil_id   uuid   NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
    empresa     text   NOT NULL,
    area        text   NOT NULL,
    CONSTRAINT uq_permiso UNIQUE (perfil_id, empresa, area)
);

CREATE INDEX IF NOT EXISTS idx_permisos_perfil
    ON public.permisos (perfil_id);


-- ---------- BLOQUE 3: funcion de acceso ----------
-- SECURITY DEFINER evita que la politica vuelva a entrar al RLS
-- de permisos y provoque recursion infinita.
-- SET search_path cierra el secuestro de esquema.
-- (SELECT auth.uid()) se evalua una vez, no por fila.

CREATE OR REPLACE FUNCTION public.tiene_acceso(p_empresa text, p_area text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        EXISTS (
            SELECT 1
            FROM public.perfiles AS pf
            WHERE pf.id = (SELECT auth.uid())
              AND pf.activo
              AND pf.es_direccion
        )
        OR EXISTS (
            SELECT 1
            FROM public.permisos AS pm
            JOIN public.perfiles AS pf
              ON pf.id = pm.perfil_id
            WHERE pm.perfil_id = (SELECT auth.uid())
              AND pf.activo
              AND pm.empresa   = p_empresa
              AND pm.area      = p_area
        );
$$;


-- ---------- BLOQUE 4: RLS de las tablas nuevas ----------
-- Solo lectura de lo propio. Sin politicas de escritura:
-- perfiles y permisos se administran con service role.

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil propio"
    ON public.perfiles
    FOR SELECT
    TO authenticated
    USING (id = (SELECT auth.uid()));

CREATE POLICY "permisos propios"
    ON public.permisos
    FOR SELECT
    TO authenticated
    USING (perfil_id = (SELECT auth.uid()));


-- ---------- BLOQUE 5: verificacion ----------

SELECT
    c.relname       AS tabla,
    c.relrowsecurity AS rls_activo
FROM
    pg_class AS c
    JOIN pg_namespace AS n
      ON n.oid = c.relnamespace
WHERE
    n.nspname = 'public'
    AND c.relname IN ('perfiles', 'permisos')
ORDER BY
    c.relname;


-- ---------- BLOQUE 6: verificacion de politicas ----------

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


-- ============================================================
-- NO CORRER TODAVIA. Esto es la fase 4, cuando el login ya
-- este verificado en preview. Cambiar estas politicas antes
-- deja el tablero en cero filas para todos.
-- ============================================================

-- DROP POLICY "lectura publica reporte" ON public.reporte_tiempos_zona_mes;
-- DROP POLICY "lectura publica etl_status" ON public.etl_status;
--
-- CREATE POLICY "lectura por permiso reporte"
--     ON public.reporte_tiempos_zona_mes
--     FOR SELECT
--     TO authenticated
--     USING (public.tiene_acceso(empresa, 'logistica'));
--
-- CREATE POLICY "lectura por permiso etl_status"
--     ON public.etl_status
--     FOR SELECT
--     TO authenticated
--     USING (public.tiene_acceso(empresa, 'logistica'));
