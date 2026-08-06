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
    { field: 'MED_COT_AUTORIZACION', desc: 'Dias que tarda una cotizacion en ser autorizada. Es la etapa mas lenta del proceso y es tiempo de espera, no de trabajo.' },
    { field: 'MED_AUTORIZACION_RECEPCION', desc: 'Dias entre que se autoriza y almacen la toma para trabajarla.' },
    { field: 'MED_RECEPCION_SURTIDO', desc: 'Dias que tarda almacen en preparar el material.' },
    { field: 'MED_SURTIDO_RUTA', desc: 'Dias entre que el material esta listo y sale a ruta.' },
    { field: 'MED_RUTA_ENTREGA', desc: 'Dias entre que sale el camion y llega al cliente.' },
    { field: 'MED_ENTREGA_VALIDACION', desc: 'Dias entre que se reporta la entrega y logistica la confirma.' },
    { field: 'MED_ENTREGA_FACTURA', desc: 'Dias entre la entrega y la facturacion. Mientras mas tarda, mas tarda en arrancar la cobranza.' },
    { field: 'CON_AUTORIZ_CXC', desc: 'Cotizaciones que necesitaron aprobacion de credito del cliente. Es la mas frecuente de las tres.' },
    { field: 'CON_AUTORIZ_DESCUENTOS', desc: 'Cotizaciones que necesitaron aprobacion de descuentos.' },
    { field: 'CON_AUTORIZ_LISTA', desc: 'Cotizaciones que necesitaron aprobacion de cambio de lista de precios.' }
  ]

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
                  <th className="py-3 px-4 font-medium w-1/4 whitespace-nowrap">Campo</th>
                  <th className="py-3 px-4 font-medium">Qué significa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(item => (
                  <tr key={item.field} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <code className="font-mono text-scale-xs bg-bg-elevated text-accent px-2 py-1 rounded border border-border/50 whitespace-nowrap">{item.field}</code>
                    </td>
                    <td className="py-3 px-4 text-scale-sm text-text-primary leading-relaxed">
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
                <code className="font-mono text-scale-xs bg-bg-surface text-accent px-2 py-1 rounded border border-border/50 mb-2 inline-block">
                  {item.field}
                </code>
                <p className="text-scale-sm text-text-primary leading-relaxed mt-1">
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
