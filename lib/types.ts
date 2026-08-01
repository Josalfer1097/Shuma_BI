export interface ReporteRow {
  id: number;
  anio_mes: string;
  zona: string;
  total: number;
  promedio_dias: number;
  mediana_dias: number;
  maximo_dias: number;
  total_con_factura: number;
  
  // v0.7.0 New metrics
  med_cot_autorizacion: number | null;
  med_autorizacion_recepcion: number | null;
  med_recepcion_surtido: number | null;
  med_surtido_ruta: number | null;
  med_ruta_entrega: number | null;
  med_entrega_validacion: number | null;
  med_entrega_factura: number | null;
  con_autoriz_lista: number;
  con_autoriz_cxc: number;
  con_autoriz_descuentos: number;

  actualizado_en: string;
}

export interface EtlStatus {
  id: number;
  ultima_corrida: string;
  fecha_corte: string;
  filas_procesadas: number;
  estado: 'OK' | 'ERROR' | 'SEED_DESARROLLO';
}

export interface DashboardMetrics {
  total: number;
  promedio_dias: number;
  mediana_dias: number;
  maximo_dias: number;
  total_con_factura: number;
  
  // v0.7.0 New metrics
  med_cot_autorizacion: number | null;
  med_autorizacion_recepcion: number | null;
  med_recepcion_surtido: number | null;
  med_surtido_ruta: number | null;
  med_ruta_entrega: number | null;
  med_entrega_validacion: number | null;
  med_entrega_factura: number | null;
  con_autoriz_lista: number;
  con_autoriz_cxc: number;
  con_autoriz_descuentos: number;
}
