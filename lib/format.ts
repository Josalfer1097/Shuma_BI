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
 * Equivalencia legible de un valor en dias fraccionarios.
 *
 * Oracle devuelve la resta de dos fechas en dias con decimales, asi que 0.6
 * no son "6 horas" sino seis decimas de dia: 14 horas 24 minutos.
 *
 * Debajo de 2 dias se expresa en horas, que es la escala en la que se piensa
 * un tramo corto. Arriba de 2 se expresa en dias y horas, porque "77 horas"
 * ya no le dice nada a nadie pero "3 d 5 h" si aclara que significa el .2.
 */
export function equivalenciaHoras(dias: number | null | undefined): string | null {
  if (dias == null || dias <= 0) return null

  const totalMinutos = Math.round(dias * 24 * 60)

  if (dias < 2) {
    const horas = Math.floor(totalMinutos / 60)
    const minutos = totalMinutos % 60
    if (horas === 0) return `${minutos} min`
    if (minutos === 0) return `${horas} h`
    return `${horas} h ${minutos} min`
  }

  const totalHoras = Math.round(totalMinutos / 60)
  const d = Math.floor(totalHoras / 24)
  const h = totalHoras % 24
  return h === 0 ? `${d} d exactos` : `${d} d ${h} h`
}
