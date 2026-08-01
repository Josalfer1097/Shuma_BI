-- ============================================================
-- MIGRACION v2 — Agregar las etapas del proceso
--
-- Correr UNA VEZ en el SQL Editor de Supabase, sobre el esquema
-- que ya existe. Es idempotente: se puede volver a correr.
--
-- Que cambia:
--  + 6 columnas de tiempo por etapa (incluye AUTORIZACION, que no
--    se media antes y resulto ser el mayor cuello de botella:
--    16.4 h de mediana, el 21% del ciclo completo).
--  + 1 columna de tiempo entrega -> facturacion.
--  + 3 columnas con el tipo de autorizacion solicitada.
--  - Se elimina facturas_fuera_de_rango: medido contra datos reales,
--    el 72.7% caia "fuera de rango" simplemente porque se factura por
--    lote al cierre del dia. Era un falso positivo, no una falla.
-- ============================================================

-- ---------- Nuevas columnas ----------
alter table reporte_tiempos_zona_mes
  add column if not exists med_cot_autorizacion        numeric(10,3),
  add column if not exists med_autorizacion_recepcion  numeric(10,3),
  add column if not exists med_recepcion_surtido       numeric(10,3),
  add column if not exists med_surtido_ruta            numeric(10,3),
  add column if not exists med_ruta_entrega            numeric(10,3),
  add column if not exists med_entrega_validacion      numeric(10,3),
  add column if not exists med_entrega_factura         numeric(10,3),
  add column if not exists con_autoriz_lista           integer,
  add column if not exists con_autoriz_cxc             integer,
  add column if not exists con_autoriz_descuentos      integer;

comment on column reporte_tiempos_zona_mes.med_cot_autorizacion is
  'Mediana de dias de cotizacion a liberacion de autorizaciones. ETAPA MAS LENTA del proceso: 16.4 h de mediana global, 21% del ciclo total.';
comment on column reporte_tiempos_zona_mes.med_autorizacion_recepcion is
  'Mediana de dias de liberacion a que almacen recibe la cotizacion.';
comment on column reporte_tiempos_zona_mes.med_recepcion_surtido is
  'Mediana de dias de recepcion en almacen a material surtido.';
comment on column reporte_tiempos_zona_mes.med_surtido_ruta is
  'Mediana de dias de surtido a salida a ruta.';
comment on column reporte_tiempos_zona_mes.med_ruta_entrega is
  'Mediana de dias de salida a ruta a entrega al cliente.';
comment on column reporte_tiempos_zona_mes.med_entrega_validacion is
  'Mediana de dias de entrega a validacion por logistica. Cierre real del ciclo.';
comment on column reporte_tiempos_zona_mes.med_entrega_factura is
  'Mediana de dias de entrega a facturacion. En Shuma se factura por lote al cierre del dia, tipicamente ~9 h despues de la entrega.';
comment on column reporte_tiempos_zona_mes.con_autoriz_cxc is
  'Cotizaciones que requirieron autorizacion de credito del cliente. Es la autorizacion mas frecuente: 76.7% del total.';
comment on column reporte_tiempos_zona_mes.con_autoriz_descuentos is
  'Cotizaciones que requirieron autorizacion de descuentos (73.8% del total).';
comment on column reporte_tiempos_zona_mes.con_autoriz_lista is
  'Cotizaciones que requirieron autorizacion de cambio de lista de precios (4.5% del total).';

-- ---------- Eliminar el indicador que resulto ser falso positivo ----------
-- Las vistas de la v1 referencian esta columna, asi que Postgres bloquea
-- el DROP mientras existan. Se eliminan primero y se recrean mas abajo
-- con las columnas nuevas.
drop view if exists v_resumen_mensual;
drop view if exists v_resumen_zona;

alter table reporte_tiempos_zona_mes
  drop column if exists facturas_fuera_de_rango;

-- ---------- Vistas actualizadas ----------
-- Las medianas se ponderan por volumen: es una aproximacion, no una
-- mediana recalculada fila por fila. Es lo correcto con datos agregados.
create or replace view v_resumen_mensual as
select
  anio_mes,
  sum(total)                                                          as total,
  round(sum(promedio_dias * total) / nullif(sum(total),0), 2)         as promedio_dias,
  round(sum(mediana_dias  * total) / nullif(sum(total),0), 2)         as mediana_dias,
  max(maximo_dias)                                                    as maximo_dias,
  round(sum(med_cot_autorizacion       * total) / nullif(sum(total),0), 3) as med_cot_autorizacion,
  round(sum(med_autorizacion_recepcion * total) / nullif(sum(total),0), 3) as med_autorizacion_recepcion,
  round(sum(med_recepcion_surtido      * total) / nullif(sum(total),0), 3) as med_recepcion_surtido,
  round(sum(med_surtido_ruta           * total) / nullif(sum(total),0), 3) as med_surtido_ruta,
  round(sum(med_ruta_entrega           * total) / nullif(sum(total),0), 3) as med_ruta_entrega,
  round(sum(med_entrega_validacion     * total) / nullif(sum(total),0), 3) as med_entrega_validacion,
  round(sum(med_entrega_factura        * total) / nullif(sum(total),0), 3) as med_entrega_factura,
  sum(total_con_factura)                                              as total_con_factura,
  sum(con_autoriz_lista)                                              as con_autoriz_lista,
  sum(con_autoriz_cxc)                                                as con_autoriz_cxc,
  sum(con_autoriz_descuentos)                                         as con_autoriz_descuentos
from reporte_tiempos_zona_mes
group by anio_mes;

create or replace view v_resumen_zona as
select
  zona,
  sum(total)                                                          as total,
  round(sum(promedio_dias * total) / nullif(sum(total),0), 2)         as promedio_dias,
  round(sum(mediana_dias  * total) / nullif(sum(total),0), 2)         as mediana_dias,
  max(maximo_dias)                                                    as maximo_dias,
  round(sum(med_cot_autorizacion       * total) / nullif(sum(total),0), 3) as med_cot_autorizacion,
  round(sum(med_autorizacion_recepcion * total) / nullif(sum(total),0), 3) as med_autorizacion_recepcion,
  round(sum(med_recepcion_surtido      * total) / nullif(sum(total),0), 3) as med_recepcion_surtido,
  round(sum(med_surtido_ruta           * total) / nullif(sum(total),0), 3) as med_surtido_ruta,
  round(sum(med_ruta_entrega           * total) / nullif(sum(total),0), 3) as med_ruta_entrega,
  round(sum(med_entrega_validacion     * total) / nullif(sum(total),0), 3) as med_entrega_validacion,
  round(sum(med_entrega_factura        * total) / nullif(sum(total),0), 3) as med_entrega_factura,
  sum(total_con_factura)                                              as total_con_factura,
  sum(con_autoriz_lista)                                              as con_autoriz_lista,
  sum(con_autoriz_cxc)                                                as con_autoriz_cxc,
  sum(con_autoriz_descuentos)                                         as con_autoriz_descuentos
from reporte_tiempos_zona_mes
group by zona;

alter view v_resumen_mensual set (security_invoker = on);
alter view v_resumen_zona    set (security_invoker = on);
