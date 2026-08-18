import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EtlStatus } from '@/lib/types'
import { ThemeToggle } from './ThemeToggle'
import { FontScaleButton } from './FontScaleButton'
import { TourButton } from './TourButton'
import { EmpresaSelector } from './EmpresaSelector'
import { BotonSesion } from './BotonSesion'
import { LogoEmpresa } from './LogoEmpresa'

interface HeaderProps {
  /** Opcional: la portada no depende del estado de la actualizacion. */
  etlStatus?: EtlStatus | null
  titulo?: string
  subtitulo?: string
  /** Ruta de regreso. Si no se pasa, no se dibuja el enlace. */
  volverA?: string
  volverTexto?: string
  /** La portada entera es el selector de empresa, ahi sobra el desplegable. */
  conSelectorEmpresa?: boolean
  /** Nombre de quien inicio sesion. Nulo dibuja el boton de entrar. */
  nombreSesion?: string | null
  /** Dibuja el logotipo sobre el titulo. Nulo en la portada, que es del grupo. */
  logoEmpresaId?: string | null
}

export function Header({
  etlStatus,
  titulo = 'Tiempos de Entrega',
  subtitulo = 'Operación logística — Grupo Shuma',
  volverA,
  volverTexto = 'Inicio',
  conSelectorEmpresa = true,
  nombreSesion = null,
  logoEmpresaId = null,
}: HeaderProps) {
  let statusText = ''
  let statusColor = ''

  if (!etlStatus) {
    statusText = ''
  } else if (etlStatus.estado === 'SEED_DESARROLLO') {
    statusText = 'Datos de desarrollo'
    statusColor = 'text-warning'
  } else if (etlStatus.estado === 'ERROR') {
    statusText = 'Fallo en la actualización'
    statusColor = 'text-danger'
  } else {
    const hoursSince = Math.max(0, (Date.now() - new Date(etlStatus.ultima_corrida).getTime()) / (1000 * 60 * 60))
    if (hoursSince < 1) {
      statusText = 'Actualizado hace unos minutos'
      statusColor = 'text-success'
    } else if (hoursSince < 2 && hoursSince >= 1) {
      statusText = 'Actualizado hace 1 hora'
      statusColor = 'text-success'
    } else if (hoursSince < 30) {
      statusText = `Actualizado hace ${Math.floor(hoursSince)} horas`
      statusColor = 'text-success'
    } else {
      statusText = 'Datos desactualizados'
      statusColor = 'text-warning'
    }
  }

  const dateStr = etlStatus?.fecha_corte ? new Date(etlStatus.fecha_corte).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' }) : ''
  const subText = etlStatus?.estado === 'ERROR' && dateStr ? `(datos hasta el ${dateStr})` : dateStr ? `(hasta el ${dateStr})` : ''

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-6 mb-6 border-b border-border gap-3">
      <div>
        {volverA && (
          <Link
            href={volverA}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-scale-sm text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {volverTexto}
          </Link>
        )}
        <h1 className="text-scale-2xl sm:text-scale-3xl font-bold font-exo text-text-primary tracking-tight">{titulo}</h1>

        {/* El logotipo ocupa el lugar de la razon social.
            Antes el nombre de la empresa aparecia tres veces en el mismo
            bloque: en el titulo, en el subtitulo y dentro del propio logo.
            Ahora el logo dice quien es, y la linea de abajo dice que pantalla
            es. Cada elemento hace un solo trabajo. */}
        {logoEmpresaId ? (
          <>
            <LogoEmpresa
              empresaId={logoEmpresaId}
              alto={40}
              className="animar-entrada mt-3"
            />
            {subtitulo && (
              <p className="text-scale-sm text-text-muted mt-2">{subtitulo}</p>
            )}
          </>
        ) : (
          <p className="text-scale-sm sm:text-scale-base text-text-muted mt-1">{subtitulo}</p>
        )}
      </div>
      <div className="flex items-center gap-3 self-end sm:self-auto">
        {statusText && (
        <div className="flex items-center space-x-2 bg-bg-surface px-3 min-h-[44px] rounded-full border border-border w-fit">
          <div className={`w-2 h-2 rounded-full ${statusColor === 'text-success' ? 'bg-success' : statusColor === 'text-danger' ? 'bg-danger' : 'bg-warning'}`} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-scale-xs sm:text-scale-sm ${statusColor}`}>{statusText}</span>
            {subText && <span className="text-scale-xs sm:text-scale-sm text-text-muted">{subText}</span>}
          </div>
        </div>
        )}
        <div className="flex items-center gap-2">
          {conSelectorEmpresa && <EmpresaSelector />}
          <TourButton />
          <FontScaleButton />
          <ThemeToggle />
          <BotonSesion nombre={nombreSesion} />
        </div>
      </div>
    </header>
  )
}
