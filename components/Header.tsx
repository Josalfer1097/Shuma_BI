import React from 'react'
import { EtlStatus } from '@/lib/types'
import { ThemeToggle } from './ThemeToggle'

export function Header({ etlStatus }: { etlStatus: EtlStatus }) {
  let statusText = ''
  let statusColor = ''

  if (etlStatus.estado === 'SEED_DESARROLLO') {
    statusText = 'Datos de desarrollo'
    statusColor = 'text-warning'
  } else {
    const hoursSince = (Date.now() - new Date(etlStatus.ultima_corrida).getTime()) / (1000 * 60 * 60)
    if (hoursSince < 30) {
      statusText = `Actualizado hace ${Math.floor(hoursSince)} horas`
      statusColor = 'text-success'
    } else {
      statusText = 'Datos desactualizados'
      statusColor = 'text-warning'
    }
  }

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-6 mb-6 border-b border-border gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-exo text-text-primary tracking-tight">Tiempos de Entrega</h1>
        <p className="text-sm sm:text-base text-text-muted mt-1">Operación logística — Grupo Shuma</p>
      </div>
      <div className="flex items-center gap-3 self-end sm:self-auto">
        <div className="flex items-center space-x-2 bg-bg-surface px-3 min-h-[44px] rounded-full border border-border w-fit">
          <div className={`w-2 h-2 rounded-full ${statusColor === 'text-success' ? 'bg-success' : 'bg-warning'}`} />
          <span className={`text-xs sm:text-sm ${statusColor}`}>{statusText}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
