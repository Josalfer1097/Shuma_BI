'use client'

import React from 'react'
import { cn, Tooltip } from './ui/Tooltip'

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  valueColor?: string;
  tooltip?: string;
}

export function KpiCard({ title, value, secondary, valueColor, tooltip }: KpiCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-full relative">
      <div className="bg-accent-deep py-2 px-3 flex items-center justify-center gap-1.5 relative">
        <span className="text-xs sm:text-sm text-white font-medium leading-tight">{title}</span>
        {tooltip && (
          <Tooltip text={tooltip} className="text-white/70 hover:text-white p-1 -m-1" />
        )}
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1 items-center justify-center text-center">
        <div className={cn("text-2xl sm:text-3xl font-exo font-semibold tracking-tight", valueColor || "text-text-primary")}>
          {value}
        </div>
        {secondary && (
          <div className="text-xs sm:text-sm font-medium mt-1 leading-tight text-text-secondary">
            {secondary}
          </div>
        )}
      </div>
    </div>
  )
}
