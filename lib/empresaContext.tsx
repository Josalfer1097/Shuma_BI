'use client'

import { createContext, useContext } from 'react'
import type { Empresa } from './empresas'

/**
 * Contexto de empresa para el modulo de logistica.
 *
 * Existe para no pasar la empresa por props a traves de cinco niveles. La
 * meta en dias y la bandera de zonas las consultan componentes profundos
 * (las graficas, el ranking, la barra de filtros) que no tienen por que
 * conocer a sus padres.
 *
 * Mismo patron que fontScaleContext, que ya usa el proyecto.
 */
const EmpresaContext = createContext<Empresa | null>(null)

export function EmpresaProvider({
  empresa,
  children,
}: {
  empresa: Empresa
  children: React.ReactNode
}) {
  return <EmpresaContext.Provider value={empresa}>{children}</EmpresaContext.Provider>
}

export function useEmpresa(): Empresa {
  const empresa = useContext(EmpresaContext)
  if (!empresa) {
    throw new Error('useEmpresa se llamo fuera de un EmpresaProvider')
  }
  return empresa
}
