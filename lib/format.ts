export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '0'
  return new Intl.NumberFormat('es-MX').format(num)
}

export function formatDecimal(num: number | null | undefined): string {
  if (num == null) return '0.0'
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num)
}

export function formatPercent(num: number, total: number): string {
  if (total === 0) return '0%'
  const percent = (num / total) * 100
  return `${formatDecimal(percent)}%`
}

/**
 * Equivalencia en horas de un valor en dias fraccionarios.
 *
 * Oracle devuelve la resta de dos fechas en dias con decimales, asi que 0.6
 * no son "6 horas" sino seis decimas de dia, o sea 14 horas 24 minutos. La
 * diferencia importa: la etapa mas lenta de CFS es 1.2 dias, que suena a "un
 * dia y algo" cuando en realidad son 29 horas.
 *
 * Devuelve null arriba de 2 dias: ahi el decimal ya no engana y la
 * equivalencia solo agrega ruido.
 */
export function equivalenciaHoras(dias: number | null | undefined): string | null {
  if (dias == null || dias >= 2 || dias <= 0) return null

  const totalMinutos = Math.round(dias * 24 * 60)
  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  if (horas === 0) return `${minutos} min`
  if (minutos === 0) return `${horas} h`
  return `${horas} h ${minutos} min`
}
