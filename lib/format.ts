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
