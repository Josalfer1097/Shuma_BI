'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function Tooltip({ text, className }: { text: string; className?: string }) {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, vAlign: 'top' as 'top' | 'bottom', hAlign: 'center' as 'center' | 'left' | 'right' })

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      
      let vAlign: 'top' | 'bottom' = 'top'
      let hAlign: 'center' | 'left' | 'right' = 'center'
      
      let top = rect.top - 8
      let left = rect.left + rect.width / 2

      if (top < 120) {
        vAlign = 'bottom'
        top = rect.bottom + 8
      }

      if (left - 128 < 16) {
        hAlign = 'left'
        left = rect.left
      } else if (left + 128 > window.innerWidth - 16) {
        hAlign = 'right'
        left = rect.right
      }

      setCoords({ top, left, vAlign, hAlign })
    }
  }

  useEffect(() => {
    if (!show) return
    
    updatePosition()

    const handleScroll = () => setShow(false)
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setShow(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShow(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true })
      window.removeEventListener('resize', handleScroll)
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
      {mounted && show && createPortal(
        <div 
          ref={tooltipRef}
          className={cn(
            "fixed w-64 p-3 bg-bg-elevated border border-border rounded shadow-xl z-[9999] text-scale-sm sm:text-scale-xs text-text-primary leading-relaxed",
            coords.vAlign === 'top' && "-translate-y-full",
            coords.hAlign === 'center' && "-translate-x-1/2",
            coords.hAlign === 'right' && "-translate-x-full"
          )}
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  )
}
