'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function Glossary() {
  const [isOpen, setIsOpen] = useState(false)

  const items = [
    { field: 'ANIO_MES', desc: 'El mes en que la cotizacion salio a ruta de entrega (no cuando se creo, sino cuando el camion la llevo).' },
    { field: 'ZONA', desc: 'La zona geografica de entrega asignada al cliente.' },
    { field: 'TOTAL', desc: 'Cuantas cotizaciones se entregaron en ese mes y esa zona, ya validadas y cerradas correctamente.' },
    { field: 'PROMEDIO_DIAS', desc: 'El promedio de dias desde que se creo la cotizacion hasta que logistica confirmo que si se entrego bien. Se puede inflar facil por unos pocos casos raros, por ejemplo una cotizacion vieja que quedo abierta mucho tiempo. No es el mejor indicador por si solo.' },
    { field: 'MEDIANA_DIAS', desc: 'El caso tipico: la mitad de las cotizaciones tardan menos que este numero y la otra mitad tarda mas. Es el numero mas confiable para saber cuanto tarda realmente el proceso, porque no lo distorsionan los casos extremos.' },
    { field: 'MAXIMO_DIAS', desc: 'El caso mas lento del mes y la zona. Util para detectar focos rojos, no para sacar promedios generales.' },
    { field: 'TOTAL_CON_FACTURA', desc: 'De esas cotizaciones, cuantas se lograron ligar a una factura. Algunas no se pueden conectar por limites tecnicos de los datos: es un hueco conocido, no un error de la operacion.' },
    { field: 'FACTURAS_FUERA_DE_RANGO', desc: 'El indicador de calidad de proceso. Cuenta las cotizaciones donde la factura se genero antes de surtir el pedido o despues de que ya salio a ruta, lo cual no deberia pasar segun el flujo esperado: surtir, facturar y luego enviar a ruta.' }
  ]

  return (
    <div className="mt-12 bg-bg-surface border border-border rounded-lg overflow-hidden mb-12">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-elevated transition-colors"
      >
        <h3 className="text-lg font-medium text-text-primary">Glosario de indicadores</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </button>

      {isOpen && (
        <div className="p-5 border-t border-border bg-bg-base/30">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-sm text-text-secondary">
                  <th className="py-3 px-4 font-medium w-1/4 whitespace-nowrap">Campo</th>
                  <th className="py-3 px-4 font-medium">Qué significa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(item => (
                  <tr key={item.field} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <code className="font-mono text-xs bg-bg-elevated text-accent px-2 py-1 rounded border border-border/50 whitespace-nowrap">{item.field}</code>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-primary leading-relaxed">
                      {item.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden flex flex-col gap-4">
            {items.map(item => (
              <div key={item.field} className="bg-bg-elevated border border-border rounded-lg p-4">
                <code className="font-mono text-xs bg-bg-surface text-accent px-2 py-1 rounded border border-border/50 mb-2 inline-block">
                  {item.field}
                </code>
                <p className="text-sm text-text-primary leading-relaxed mt-1">
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
