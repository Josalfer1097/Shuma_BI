'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function Tooltip({ text, className }: { text: string; className?: string }) {
  const [show, setShow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShow(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [show])

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button 
        type="button"
        onClick={() => setShow(!show)}
        className={cn("p-3 -m-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer duration-150 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/50", className)}
        aria-label="Información adicional"
      >
        <Info className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-64 p-3 bg-bg-elevated border border-border rounded shadow-xl z-50 text-sm sm:text-xs text-text-primary leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}
