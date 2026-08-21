'use client'

import React from 'react'
import { cn, Tooltip } from '../ui/Tooltip'

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  secondaryValue?: React.ReactNode;
  secondaryLayout?: 'stack' | 'inline';
  valueColor?: string;
  tooltip?: string;
  className?: string;
}

export function KpiCard({ title, value, secondary, secondaryValue, secondaryLayout = 'stack', valueColor, tooltip, className }: KpiCardProps) {
  const actualSecondary = secondary || secondaryValue;

  return (
    <div className={cn("bg-bg-surface border border-border rounded-lg flex flex-col h-full relative", className)}>
      <div
        // Filo, no relleno.
        //
        // Antes el encabezado se rellenaba con la masa de la empresa. En
        // Acabados eso daba seis bloques escarlata en fila, a 1.22:1 de
        // --danger: nadie los leia como identidad, los leia como seis
        // alarmas. Y justo en la empresa que mejor va (1.7 d contra meta
        // de 3).
        //
        // Con el color reducido a una linea de 3 px arriba, la identidad se
        // conserva y el rojo vuelve a significar una sola cosa: problema.
        style={{
          background: 'color-mix(in srgb, var(--ma, var(--accent-deep)) 22%, var(--bg-elevated))',
          borderTop: '3px solid var(--co, var(--accent))',
        }}
        className="py-2 px-3 flex items-center justify-center gap-1.5 rounded-t-lg relative"
      >
        <span className="text-scale-xs sm:text-scale-sm text-text-primary font-medium leading-tight">{title}</span>
        {tooltip && (
          <Tooltip text={tooltip} className="text-text-muted hover:text-text-primary p-1 -m-1" />
        )}
      </div>
      <div className={cn(
        "p-4 sm:p-5 flex flex-1 items-center justify-center text-center",
        secondaryLayout === 'stack' ? "flex-col" : "flex-row gap-3 flex-wrap"
      )}>
        <div className={cn("text-scale-2xl sm:text-scale-3xl font-exo font-semibold tracking-tight", valueColor || "text-text-primary")}>
          {value}
        </div>
        {actualSecondary && (
          <div className="text-scale-xs sm:text-scale-sm font-medium leading-tight text-text-secondary mt-1">
            {actualSecondary}
          </div>
        )}
      </div>
    </div>
  )
}
