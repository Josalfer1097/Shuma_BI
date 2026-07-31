'use client'

import React, { useState } from 'react'
import { Info } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function Tooltip({ text, className }: { text: string; className?: string }) {
  const [show, setShow] = useState(false)

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info className={cn("w-4 h-4 text-text-muted hover:text-text-primary transition-colors cursor-help duration-150", className)} />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-bg-elevated border border-border rounded shadow-lg z-50 text-xs text-text-primary">
          {text}
        </div>
      )}
    </div>
  )
}
