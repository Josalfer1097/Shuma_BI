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

import { TooltipDato } from './ui/TooltipDato'

interface HeaderProps {
  /** Opcional: la portada no depende del estado de la actualizacion. */
  etlStatus?: EtlStatus | EtlStatus[] | null
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
  /**
   * El logotipo SUSTITUYE al titulo visible.
   *
   * Sirve para la pantalla de areas, donde el titulo era el nombre de la
   * empresa y repetia lo que el logotipo ya dice. El h1 sigue existiendo para
   * lectores de pantalla y para el arbol de encabezados: se oculta a la
   * vista, no se elimina.
   */
  logoEsTitulo?: boolean
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
  logoEsTitulo = false,
}: HeaderProps) {
  let statusText = ''
  let statusColor = ''
  
  let activeStatus: EtlStatus | null = null
  let isMultiple = false
  let statusArray: EtlStatus[] = []

  if (etlStatus) {
    statusArray = Array.isArray(etlStatus) ? etlStatus : [etlStatus]
    isMultiple = statusArray.length > 1
    
    if (statusArray.length > 0) {
      const badStatus = statusArray.find(s => s.estado === 'ERROR' || s.estado === 'NUNCA_CORRIO')
      if (badStatus) {
        activeStatus = badStatus
      } else {
        activeStatus = statusArray.reduce((oldest, current) => {
          const oldestTime = new Date(oldest.ultima_corrida).getTime()
          const currentTime = new Date(current.ultima_corrida).getTime()
          return currentTime < oldestTime ? current : oldest
        })
      }
    }
  }

  if (!activeStatus) {
    statusText = ''
  } else if (activeStatus.estado === 'SEED_DESARROLLO') {
    statusText = 'Datos de desarrollo'
    statusColor = 'text-warning'
  } else if (activeStatus.estado === 'ERROR') {
    statusText = 'Fallo en la actualización'
    statusColor = 'text-danger'
  } else if (activeStatus.estado === 'NUNCA_CORRIO') {
    statusText = 'Datos desactualizados'
    statusColor = 'text-warning'
  } else {
    const hoursSince = Math.max(0, (Date.now() - new Date(activeStatus.ultima_corrida).getTime()) / (1000 * 60 * 60))
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

  const dateStr = activeStatus?.fecha_corte ? new Date(activeStatus.fecha_corte).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' }) : ''
  const subText = activeStatus?.estado === 'ERROR' && dateStr ? `(datos hasta el ${dateStr})` : dateStr ? `(hasta el ${dateStr})` : ''

  const tooltipContent = isMultiple ? (
    <div className="space-y-1">
      {statusArray.map((s, i) => {
        const nombre = s.area === 'ventas' ? 'Ventas' : s.area === 'logistica' ? 'Logística' : (s.area ? s.area.charAt(0).toUpperCase() + s.area.slice(1) : 'Desconocido');
        let antiguedad = '';
        if (s.estado === 'NUNCA_CORRIO') {
          antiguedad = 'sin datos';
        } else if (s.estado === 'ERROR') {
          antiguedad = 'fallo';
        } else if (s.estado === 'SEED_DESARROLLO') {
          antiguedad = 'datos de prueba';
        } else {
          const hours = Math.max(0, (Date.now() - new Date(s.ultima_corrida).getTime()) / (1000 * 60 * 60));
          if (hours < 1) antiguedad = 'hace unos minutos';
          else if (hours < 2) antiguedad = 'hace 1 hora';
          else if (hours < 24) antiguedad = `hace ${Math.floor(hours)} horas`;
          else antiguedad = `hace ${Math.floor(hours / 24)} días`;
        }
        return (
          <div key={i} className="flex justify-between gap-4">
            <span className="font-medium text-text-primary">{nombre}</span>
            <span className="text-text-secondary">{antiguedad}</span>
          </div>
        );
      })}
    </div>
  ) : null;

  // Dos filas, no dos columnas.
  //
  // Con el logotipo dentro del bloque de titulo, la columna izquierda llegaba
  // a cuatro niveles y los controles quedaban centrados contra ella, dejando
  // un hueco grande a la derecha del titulo. Separando navegacion y controles
  // en una fila de arriba, la segunda queda libre para poner el titulo a la
  // izquierda y el logotipo a la derecha: eso llena el hueco y deja crecer al
  // logotipo sin robarle ancho al titulo, que antes se partia en dos renglones.
  return (
    <header className="pb-4 sm:pb-6 mb-6 border-b border-border">
      <div className="flex items-center justify-between gap-3">
        {volverA ? (
          <Link
            href={volverA}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-scale-sm text-text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {volverTexto}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {statusText && (
            isMultiple ? (
              <TooltipDato contenido={tooltipContent}>
                <div className="flex items-center space-x-2 bg-bg-surface px-3 min-h-[44px] rounded-full border border-border w-fit cursor-default">
                  <div className={`w-2 h-2 rounded-full ${statusColor === 'text-success' ? 'bg-success' : statusColor === 'text-danger' ? 'bg-danger' : 'bg-warning'}`} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-scale-xs sm:text-scale-sm ${statusColor}`}>{statusText}</span>
                    {subText && <span className="text-scale-xs sm:text-scale-sm text-text-muted">{subText}</span>}
                  </div>
                </div>
              </TooltipDato>
            ) : (
              <div className="flex items-center space-x-2 bg-bg-surface px-3 min-h-[44px] rounded-full border border-border w-fit">
                <div className={`w-2 h-2 rounded-full ${statusColor === 'text-success' ? 'bg-success' : statusColor === 'text-danger' ? 'bg-danger' : 'bg-warning'}`} />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-scale-xs sm:text-scale-sm ${statusColor}`}>{statusText}</span>
                  {subText && <span className="text-scale-xs sm:text-scale-sm text-text-muted">{subText}</span>}
                </div>
              </div>
            )
          )}
          <div className="flex items-center gap-2">
            {conSelectorEmpresa && <EmpresaSelector />}
            <TourButton />
            <FontScaleButton />
            <ThemeToggle />
            <BotonSesion nombre={nombreSesion} />
          </div>
        </div>
      </div>

      {/* Tres arreglos posibles:
          1. Sin logotipo (portada del grupo): titulo y subtitulo, como antes.
          2. Logotipo COMO titulo (pantalla de areas): el logotipo grande ocupa
             el lugar del nombre de la empresa, que repetia lo que el propio
             logotipo dice. El h1 queda para lectores de pantalla.
          3. Logotipo Y titulo (modulos): titulo a la izquierda, logotipo a la
             derecha. Son dos columnas, no dos elementos peleando por el mismo
             renglon, asi que el logotipo puede ser grande y el titulo cabe en
             una linea. En movil se apilan con el logotipo arriba. */}
      <div className="mt-3 sm:mt-4">
        {!logoEmpresaId ? (
          <>
            <h1 className="text-scale-2xl sm:text-scale-3xl font-bold font-exo text-text-primary tracking-tight">
              {titulo}
            </h1>
            <p className="text-scale-sm sm:text-scale-base text-text-muted mt-1">{subtitulo}</p>
          </>
        ) : logoEsTitulo ? (
          <>
            <h1 className="sr-only">{titulo}</h1>
            <LogoEmpresa
              empresaId={logoEmpresaId}
              alto="clamp(46px, 13vw, 80px)"
              className="animar-entrada"
            />
            {subtitulo && (
              <p className="text-scale-sm sm:text-scale-base text-text-muted mt-3">
                {subtitulo}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="order-2 min-w-0 sm:order-1">
              <h1 className="text-scale-2xl sm:text-scale-3xl font-bold font-exo text-text-primary tracking-tight">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-scale-sm sm:text-scale-base text-text-muted mt-2">{subtitulo}</p>
              )}
            </div>
            <LogoEmpresa
              empresaId={logoEmpresaId}
              alto="clamp(40px, 9vw, 72px)"
              className="animar-entrada order-1 shrink-0 sm:order-2"
            />
          </div>
        )}
      </div>
    </header>
  )
}
