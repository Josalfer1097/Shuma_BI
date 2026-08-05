'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function KpiDescriptions() {
  const [isOpen, setIsOpen] = useState(false)

  const items = [
    { title: 'Total entregas', desc: 'Cotizaciones validadas y cerradas correctamente en la seleccion actual.' },
    { title: 'Promedio dias', desc: 'Promedio real de dias, exacto para la seleccion. Sensible a casos extremos.' },
    { title: 'Mediana dias', desc: 'Promedio ponderado de las medianas mensuales — el numero mas confiable de "tiempo tipico".' },
    { title: 'Maximo dias', desc: 'El caso mas lento dentro de la seleccion — util para detectar focos rojos.' },
    { title: 'Con factura ligada', desc: 'Cotizaciones que si se lograron ligar a su factura por la cadena pedido → remision → factura.' },
    { title: 'Dias hasta facturar', desc: 'Tiempo entre que se entrega el material y se genera la factura. En Shuma se factura por lote al cierre del dia.' }
  ]

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden mb-8">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-elevated transition-colors"
      >
        <h3 className="text-scale-lg font-medium text-text-primary">Que significa cada indicador</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </button>

      {isOpen && (
        <div className="p-5 border-t border-border bg-bg-base/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.title} className="flex flex-col">
                <span className="font-semibold text-text-primary mb-1">{item.title}</span>
                <p className="text-scale-sm text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
