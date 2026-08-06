'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { EMPRESAS, buscarEmpresa, Empresa } from '@/lib/empresas'
import { cn } from './ui/Tooltip'

export function EmpresaSelector() {
  const router = useRouter()
  const pathname = usePathname()
  
  // Extraer el primer segmento de la ruta, por ejemplo "cfs" de "/cfs/logistica"
  const primerSegmento = pathname.split('/')[1]
  const empresaActiva = buscarEmpresa(primerSegmento)

  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // En un caso real verificariamos si el clic fue en el portal
        const target = e.target as HTMLElement
        if (!target.closest('[role="menu"]')) {
          setIsOpen(false)
        }
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  const handleSelect = (empresa: Empresa) => {
    setIsOpen(false)
    if (empresaActiva?.id === empresa.id) return

    // Al cambiar de empresa, reemplazamos el primer segmento y eliminamos search params
    const segmentos = pathname.split('/')
    if (empresaActiva) {
      segmentos[1] = empresa.id
    } else {
      // Si estamos en portada ('/'), ir a la vista general de la empresa
      segmentos.push(empresa.id, 'logistica')
    }
    const nuevaRuta = segmentos.join('/') || '/'
    router.push(nuevaRuta)
  }

  const menu = isOpen ? (
    <div
      role="menu"
      className="bg-bg-elevated border border-border rounded-lg shadow-xl p-2 min-w-[240px] z-[100]"
      style={menuStyle}
    >
      {EMPRESAS.map((emp) => {
        const isSelected = empresaActiva?.id === emp.id
        return (
          <button
            key={emp.id}
            role="menuitemcheckbox"
            aria-checked={isSelected}
            onClick={() => handleSelect(emp)}
            className="w-full flex items-center justify-between gap-3 px-3 min-h-[44px] hover:bg-bg-surface transition-colors rounded text-left group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full shrink-0 border border-border/50" 
                style={{ backgroundColor: `var(--empresa-${emp.id})` }}
              />
              <span className={cn(
                "text-scale-sm font-medium",
                isSelected ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
              )}>
                {emp.nombreCorto}
              </span>
            </div>
            {isSelected && <Check className="w-4 h-4 text-text-primary" />}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-h-[44px] px-3 bg-bg-surface hover:bg-bg-elevated border border-border rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {empresaActiva ? (
          <>
            <div 
              className="w-3 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: `var(--empresa-${empresaActiva.id})` }}
            />
            <span className="text-scale-sm font-medium text-text-primary hidden sm:inline-block">
              {empresaActiva.nombreCorto}
            </span>
          </>
        ) : (
          <span className="text-scale-sm font-medium text-text-primary">
            Seleccionar empresa
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(menu, document.body)}
    </>
  )
}
