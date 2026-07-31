export interface ReporteRow {
  id: number;
  anio_mes: string;
  zona: string;
  total: number;
  promedio_dias: number;
  mediana_dias: number;
  maximo_dias: number;
  total_con_factura: number;
  facturas_fuera_de_rango: number;
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
  facturas_fuera_de_rango: number;
}
