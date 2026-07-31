'use client'
import { cn } from './Tooltip'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-bg-elevated rounded", className)} />
  )
}
