'use client'

import React from 'react'
import { cn } from './ui/Tooltip'

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  valueColor?: string;
}

export function KpiCard({ title, value, secondary, valueColor }: KpiCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-accent-deep py-2 px-3 text-center">
        <span className="text-xs sm:text-sm text-white font-medium leading-tight">{title}</span>
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
