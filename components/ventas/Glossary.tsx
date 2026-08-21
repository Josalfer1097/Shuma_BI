'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { GLOSARIO_VENTAS } from '@/lib/hallazgosVentas'

export function Glossary() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-12 bg-bg-surface border border-border rounded-lg overflow-hidden mb-12">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-elevated transition-colors"
      >
        <h3 className="text-scale-lg font-medium text-text-primary">Glosario de indicadores</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </button>

      {isOpen && (
        <div className="p-5 border-t border-border bg-bg-base/30">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-scale-sm text-text-secondary">
                  <th className="py-3 px-4 font-medium w-1/4 whitespace-nowrap">Término</th>
                  <th className="py-3 px-4 font-medium">Qué significa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {GLOSARIO_VENTAS.map(item => (
                  <tr key={item.termino} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <span className="font-medium text-scale-sm text-text-primary px-2 py-1 whitespace-nowrap">{item.termino}</span>
                    </td>
                    <td className="py-3 px-4 text-scale-sm text-text-primary leading-relaxed">
                      {item.definicion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden flex flex-col gap-4">
            {GLOSARIO_VENTAS.map(item => (
              <div key={item.termino} className="bg-bg-elevated border border-border rounded-lg p-4">
                <span className="font-medium text-scale-sm text-text-primary mb-2 inline-block">
                  {item.termino}
                </span>
                <p className="text-scale-sm text-text-primary leading-relaxed mt-1">
                  {item.definicion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
