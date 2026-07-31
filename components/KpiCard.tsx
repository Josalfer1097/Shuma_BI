'use client'

import React from 'react'
import { cn } from './ui/Tooltip'

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  description: string;
  valueColor?: string;
}

export function KpiCard({ title, value, secondary, description, valueColor }: KpiCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-accent-deep py-2 px-3 text-center">
        <span className="text-xs sm:text-sm text-text-primary font-medium leading-tight">{title}</span>
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1 items-center justify-center text-center">
        <div className={cn("text-2xl sm:text-3xl font-exo font-semibold tracking-tight", valueColor || "text-text-primary")}>
          {value}
        </div>
        {secondary && (
          <div className="text-xs sm:text-sm font-medium mt-1 mb-2 leading-tight">
            {secondary}
          </div>
        )}
        <div className="mt-auto pt-3 text-[11px] sm:text-xs italic text-text-muted leading-tight">
          {description}
        </div>
      </div>
    </div>
  )
}
