'use client'

import React from 'react'
import { Tooltip } from './ui/Tooltip'
import { cn } from './ui/Tooltip'

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  tooltip: string;
  alert?: boolean;
}

export function KpiCard({ title, value, secondary, tooltip, alert }: KpiCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:bg-bg-elevated transition-colors duration-150 group">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs sm:text-sm text-text-secondary font-medium leading-tight">{title}</span>
        <Tooltip text={tooltip} />
      </div>
      <div className={cn("text-2xl sm:text-3xl font-exo font-semibold tracking-tight", alert ? "text-warning" : "text-text-primary")}>
        {value}
      </div>
      {secondary && (
        <div className="text-[11px] sm:text-xs text-text-muted mt-1 tabular-nums leading-tight">
          {secondary}
        </div>
      )}
    </div>
  )
}
