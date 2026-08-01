-- ============================================================
-- DASHBOARD TIEMPOS DE ENTREGA — Esquema Supabase
-- Grupo Shuma / Logistica
--
-- Correr COMPLETO en: Supabase -> SQL Editor -> New query -> Run
-- Es idempotente: lo puedes volver a correr sin romper nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABLA PRINCIPAL — agregado Zona x Año-Mes
--    Es la que alimenta todas las graficas del dashboard.
--    El ETL la borra y la reinserta completa cada noche.
-- ------------------------------------------------------------
create table if not exists reporte_tiempos_zona_mes (
  id                       bigint generated always as identity primary key,

  anio_mes                 text        not null,   -- 'YYYY-MM', eje de tiempo (basado en FECHA_RUTA)
  zona                     text        not null,   -- 'ZONA 1'..'ZONA 12', 'SIN ZONA', 'EXTRAORDINARIA'

  total                    integer     not null,
  promedio_dias            numeric(10,2),
  mediana_dias             numeric(10,2),
  maximo_dias              numeric(10,2),

  total_con_factura        integer,
  
  med_cot_autorizacion       numeric(10,2),
  med_autorizacion_recepcion numeric(10,2),
  med_recepcion_surtido      numeric(10,2),
  med_surtido_ruta           numeric(10,2),
  med_ruta_entrega           numeric(10,2),
  med_entrega_validacion     numeric(10,2),
  med_entrega_factura        numeric(10,2),
  
  con_autoriz_lista          integer,
  con_autoriz_cxc            integer,
  con_autoriz_descuentos     integer,

  actualizado_en           timestamptz not null default now(),

  constraint uq_zona_mes unique (anio_mes, zona),
  constraint ck_total_positivo check (total >= 0)
);

-- Comentarios de negocio: documentacion viva. Ayudan a que cualquier
-- dev (o IA como Antigravity) que lea el esquema entienda cada campo.
comment on table  reporte_tiempos_zona_mes is
  'Tiempos de entrega agregados por zona y mes. Solo cotizaciones FACTURADAS, tipo EMBARQUE, validadas por logistica, con cadena de fechas completa y excluyendo cierres masivos por lote.';
comment on column reporte_tiempos_zona_mes.anio_mes is
  'Mes en que la cotizacion salio a ruta de entrega (FECHA_RUTA), formato YYYY-MM.';
comment on column reporte_tiempos_zona_mes.zona is
  'Zona geografica de entrega asignada al cliente.';
comment on column reporte_tiempos_zona_mes.total is
  'Cotizaciones entregadas y validadas correctamente en ese mes y zona.';
comment on column reporte_tiempos_zona_mes.promedio_dias is
  'Promedio de dias desde creacion de la cotizacion hasta validacion de entrega. Sensible a casos extremos.';
comment on column reporte_tiempos_zona_mes.mediana_dias is
  'Mediana de dias (caso tipico). METRICA PRINCIPAL del dashboard: no la distorsionan los outliers.';
comment on column reporte_tiempos_zona_mes.maximo_dias is
  'Caso mas lento del mes/zona. Util para detectar focos rojos, no para promediar.';
comment on column reporte_tiempos_zona_mes.total_con_factura is
  'Cotizaciones que se lograron ligar a su factura via cadena pedido->remision->factura.';

create index if not exists idx_tiempos_anio_mes on reporte_tiempos_zona_mes (anio_mes);
create index if not exists idx_tiempos_zona     on reporte_tiempos_zona_mes (zona);


-- ------------------------------------------------------------
-- 2. ESTADO DEL ETL — un solo registro (id = 1)
--    El frontend lo lee para mostrar "actualizado hace X"
--    y avisar si el job lleva mas de ~30h sin correr.
-- ------------------------------------------------------------
create table if not exists etl_status (
  id                 integer primary key default 1,
  ultima_corrida     timestamptz,
  fecha_corte        date,          -- hasta que dia (D-1) cubre el dato
  filas_procesadas   integer,
  duracion_segundos  numeric(10,2),
  estado             text,          -- 'OK' | 'ERROR' | 'NUNCA_CORRIDO'
  mensaje_error      text,
  constraint ck_single_row check (id = 1)
);

comment on table etl_status is
  'Estado de la ultima corrida del ETL. Siempre tiene exactamente una fila (id=1).';

insert into etl_status (id, estado) values (1, 'NUNCA_CORRIDO')
  on conflict (id) do nothing;


-- ------------------------------------------------------------
-- 3. VISTAS AUXILIARES — para que el frontend consulte directo
--    sin replicar la logica de agregacion en JavaScript.
-- ------------------------------------------------------------

-- 3.1 Resumen por mes (todas las zonas juntas)
--     Nota: la mediana se pondera por volumen. No es una mediana
--     recalculada fila por fila (eso requeriria el detalle a nivel
--     cotizacion individual), pero es la mejor aproximacion con
--     los datos agregados.
create or replace view v_resumen_mensual as
select
  anio_mes,
  sum(total)                                                   as total,
  round(sum(promedio_dias * total) / nullif(sum(total), 0), 2) as promedio_dias,
  round(sum(mediana_dias  * total) / nullif(sum(total), 0), 2) as mediana_dias,
  max(maximo_dias)                                             as maximo_dias,
  sum(total_con_factura)                                       as total_con_factura,
  round(sum(med_cot_autorizacion * total) / nullif(sum(total), 0), 2) as med_cot_autorizacion,
  round(sum(med_autorizacion_recepcion * total) / nullif(sum(total), 0), 2) as med_autorizacion_recepcion,
  round(sum(med_recepcion_surtido * total) / nullif(sum(total), 0), 2) as med_recepcion_surtido,
  round(sum(med_surtido_ruta * total) / nullif(sum(total), 0), 2) as med_surtido_ruta,
  round(sum(med_ruta_entrega * total) / nullif(sum(total), 0), 2) as med_ruta_entrega,
  round(sum(med_entrega_validacion * total) / nullif(sum(total), 0), 2) as med_entrega_validacion,
  round(sum(med_entrega_factura * total) / nullif(sum(total), 0), 2) as med_entrega_factura,
  sum(con_autoriz_lista) as con_autoriz_lista,
  sum(con_autoriz_cxc) as con_autoriz_cxc,
  sum(con_autoriz_descuentos) as con_autoriz_descuentos
from reporte_tiempos_zona_mes
group by anio_mes;

comment on view v_resumen_mensual is
  'Serie de tiempo mensual consolidada (todas las zonas). Para la grafica de linea del dashboard.';


-- 3.2 Resumen por zona (todo el periodo)
create or replace view v_resumen_zona as
select
  zona,
  sum(total)                                                   as total,
  round(sum(promedio_dias * total) / nullif(sum(total), 0), 2) as promedio_dias,
  round(sum(mediana_dias  * total) / nullif(sum(total), 0), 2) as mediana_dias,
  max(maximo_dias)                                             as maximo_dias,
  sum(total_con_factura)                                       as total_con_factura,
  round(sum(med_cot_autorizacion * total) / nullif(sum(total), 0), 2) as med_cot_autorizacion,
  round(sum(med_autorizacion_recepcion * total) / nullif(sum(total), 0), 2) as med_autorizacion_recepcion,
  round(sum(med_recepcion_surtido * total) / nullif(sum(total), 0), 2) as med_recepcion_surtido,
  round(sum(med_surtido_ruta * total) / nullif(sum(total), 0), 2) as med_surtido_ruta,
  round(sum(med_ruta_entrega * total) / nullif(sum(total), 0), 2) as med_ruta_entrega,
  round(sum(med_entrega_validacion * total) / nullif(sum(total), 0), 2) as med_entrega_validacion,
  round(sum(med_entrega_factura * total) / nullif(sum(total), 0), 2) as med_entrega_factura,
  sum(con_autoriz_lista) as con_autoriz_lista,
  sum(con_autoriz_cxc) as con_autoriz_cxc,
  sum(con_autoriz_descuentos) as con_autoriz_descuentos
from reporte_tiempos_zona_mes
group by zona;

comment on view v_resumen_zona is
  'Ranking de zonas por tiempo tipico de entrega. Para la grafica de barras del dashboard.';


-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    El frontend (Vercel) usa la ANON KEY -> solo lectura.
--    El ETL usa la SERVICE ROLE KEY -> ignora RLS, puede escribir.
--    NUNCA pongas la service role key en el frontend.
-- ------------------------------------------------------------
alter table reporte_tiempos_zona_mes enable row level security;
alter table etl_status               enable row level security;

drop policy if exists "lectura publica reporte"    on reporte_tiempos_zona_mes;
drop policy if exists "lectura publica etl_status" on etl_status;

create policy "lectura publica reporte" on reporte_tiempos_zona_mes
  for select using (true);

create policy "lectura publica etl_status" on etl_status
  for select using (true);


-- ------------------------------------------------------------
-- 5. VERIFICACION — corre esto despues para confirmar que quedo bien
-- ------------------------------------------------------------
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- select * from etl_status;


-- ------------------------------------------------------------
-- 6. AJUSTE — quitar la etiqueta "UNRESTRICTED" de las vistas
--    Por defecto una vista corre con permisos de su dueño e ignora
--    el RLS de las tablas base. Con security_invoker las vistas
--    respetan las politicas de quien consulta.
-- ------------------------------------------------------------
alter view v_resumen_mensual set (security_invoker = on);
alter view v_resumen_zona    set (security_invoker = on);
