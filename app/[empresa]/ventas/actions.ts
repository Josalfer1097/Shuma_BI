'use server'

import { crearClienteServidor } from '@/lib/supabase-server'
import type { FilaRankingVista } from '@/lib/ventas'

export async function traerRankingProductoAction(empresaId: string): Promise<FilaRankingVista[]> {
  const supabase = crearClienteServidor()
  const BLOQUE = 1000
  const filas: FilaRankingVista[] = []
  
  for (let desde = 0; ; desde += BLOQUE) {
    const { data, error } = await supabase
      .from('v_ventas_ranking')
      .select('*')
      .eq('empresa', empresaId)
      .eq('dimension', 'producto')
      .range(desde, desde + BLOQUE - 1)
      
    if (error) throw error
    filas.push(...((data ?? []) as FilaRankingVista[]))
    if (!data || data.length < BLOQUE) break
  }
  
  return filas
}
