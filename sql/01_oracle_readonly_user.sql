-- ============================================================
-- Usuario de SOLO LECTURA para el ETL de tiempos de entrega.
-- Correr una sola vez, como DBA (o tu usuario con privilegios),
-- directo en consola de DataGrip. NUNCA usar tu usuario personal
-- en el script de Python.
-- ============================================================

-- 1. Crear el usuario (ajusta el password antes de correr)
CREATE USER ETL_DASHBOARD IDENTIFIED BY "CAMBIA_ESTE_PASSWORD_123!";

-- 2. Permiso mínimo para conectarse
GRANT CREATE SESSION TO ETL_DASHBOARD;

-- 3. Solo SELECT sobre las tablas que usa el query -- nada de
--    INSERT/UPDATE/DELETE/ALTER, ni sobre estas ni sobre ninguna otra tabla.
GRANT SELECT ON SHUMA.VTATD_COTIZACION       TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.LOGTR_RECEPCION        TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.VTATC_STATUS_COTIZACION TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.COBTR_DIRECCION        TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.UTITC_ZONA             TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.VTATD_PEDIDO           TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.VTATD_REMISION         TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.VTATR_FACTURA_REMISION TO ETL_DASHBOARD;
GRANT SELECT ON SHUMA.VTATD_FACTURA          TO ETL_DASHBOARD;

-- 4. Límite de recursos por sesión, para que un query mal escrito
--    en el futuro no pueda tumbar la base (opcional pero recomendado).
ALTER USER ETL_DASHBOARD PROFILE DEFAULT;

-- 5. Verificación: confirma que el usuario NO tiene permisos de escritura
--    (debe devolver 0 filas)
SELECT PRIVILEGE FROM DBA_SYS_PRIVS WHERE GRANTEE = 'ETL_DASHBOARD'
  AND PRIVILEGE NOT IN ('CREATE SESSION');
