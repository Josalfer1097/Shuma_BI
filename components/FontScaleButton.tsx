'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { useFontScale, FONT_SCALES, FontScale } from '@/lib/fontScaleContext'
import { cn } from './ui/Tooltip'

export function FontScaleButton() {
  const { scale, setScale } = useFontScale()
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [previewScale, setPreviewScale] = useState<FontScale | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
    const mql = window.matchMedia('(hover: none) and (pointer: coarse)')
    setIsTouch(mql.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // Position below the button, aligned to the right (since it's typically on the right side of header)
      const top = rect.bottom + 8
      let left = rect.right - 280 // width is w-72 (288px), rough estimate. We'll set right: auto and translate.
      
      if (left < 16) left = 16
      
      setCoords({ top, left: rect.right })
    }
  }

  useEffect(() => {
    if (!show) {
      setPreviewScale(null)
      return
    }
    
    updatePosition()

    const handleScroll = () => setShow(false)
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
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

  if (!mounted) {
    return (
      <button 
        className="w-[44px] h-[44px] flex items-center justify-center rounded-full bg-bg-surface border border-border text-text-muted opacity-50"
        aria-label="Cargando tamaño de texto"
        disabled
      >
        <span className="font-bold text-lg font-exo">Aa</span>
      </button>
    )
  }

  const currentPreview = previewScale !== null ? previewScale : scale
  // Base size for preview: 14px (text-sm equivalent approximately, or maybe 16px)
  const previewFontSize = Math.round(16 * currentPreview)

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        onClick={() => setShow(!show)}
        className={cn(
          "w-[44px] h-[44px] flex items-center justify-center rounded-full border transition-colors",
          show 
            ? "bg-bg-elevated border-border text-text-primary" 
            : "bg-bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
        )}
        aria-label="Ajustar tamaño de texto"
        aria-expanded={show}
      >
        <span className="font-bold text-lg font-exo">Aa</span>
      </button>

      {show && createPortal(
        <div
          ref={popupRef}
          className="fixed w-72 bg-bg-surface border border-border rounded-lg shadow-xl z-[9999] flex flex-col overflow-hidden -translate-x-full"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="p-4 border-b border-border bg-bg-elevated/50">
            <p className="text-scale-xs text-text-muted mb-2 uppercase tracking-wider font-semibold">Vista previa</p>
            <div className="h-16 flex items-center justify-center bg-bg-base border border-border rounded">
              <span 
                className="font-exo font-medium text-text-primary transition-all duration-200" 
                style={{ fontSize: previewFontSize }}
              >
                Mediana 3.31 días
              </span>
            </div>
          </div>
          
          <div className="p-2 flex flex-col" role="menu">
            {FONT_SCALES.map((opt) => {
              const isActive = scale === opt.value
              const isPreviewingThis = previewScale === opt.value
              
              return (
                <button
                  key={opt.value}
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={cn(
                    "flex items-center justify-between px-3 h-[44px] rounded-md transition-colors text-left",
                    (isActive && !isTouch) || (isTouch && isPreviewingThis) ? "bg-accent/10 text-accent font-medium" : "text-text-primary hover:bg-bg-elevated"
                  )}
                  onMouseEnter={() => !isTouch && setPreviewScale(opt.value)}
                  onMouseLeave={() => !isTouch && setPreviewScale(null)}
                  onFocus={() => !isTouch && setPreviewScale(opt.value)}
                  onBlur={() => !isTouch && setPreviewScale(null)}
                  onClick={() => {
                    if (isTouch) {
                      setPreviewScale(opt.value)
                    } else {
                      setScale(opt.value)
                      setShow(false)
                    }
                  }}
                >
                  <span className="text-scale-sm">{opt.label}</span>
                  {isActive && !isTouch && <Check className="w-4 h-4 text-accent" />}
                  {isTouch && isPreviewingThis && isActive && <Check className="w-4 h-4 text-accent" />}
                </button>
              )
            })}
          </div>

          {isTouch && (
            <div className="p-3 border-t border-border bg-bg-elevated/50">
              <button
                onClick={() => {
                  if (previewScale !== null) {
                    setScale(previewScale)
                  }
                  setShow(false)
                }}
                className="w-full h-[44px] bg-accent text-white rounded font-medium disabled:opacity-50"
                disabled={previewScale === null || previewScale === scale}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
