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
    <div className="bg-bg-surface border border-border rounded-lg p-5 flex flex-col justify-between hover:bg-bg-elevated transition-colors duration-150 group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary font-medium">{title}</span>
        <Tooltip text={tooltip} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className={cn("text-3xl font-exo font-semibold tracking-tight", alert ? "text-warning" : "text-text-primary")}>
        {value}
      </div>
      {secondary && (
        <div className="text-xs text-text-muted mt-1 tabular-nums">
          {secondary}
        </div>
      )}
    </div>
  )
}
