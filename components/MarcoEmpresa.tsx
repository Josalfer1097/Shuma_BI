'use client'

import type { ReactNode } from 'react'

interface Props {
  empresaId: string
  children: ReactNode
}

/**
 * Propaga la identidad de la empresa a todo lo que cuelgue debajo.
 *
 * Define --co (tinta) y --ma (masa) como variables CSS heredadas, para que
 * los componentes internos no tengan que recibir el color por props. Un
 * componente nuevo hereda la identidad sin que nadie se acuerde de pasarsela.
 *
 * REGLA: --co y --ma solo pueden tocar CROMO -- encabezados, filos,
 * ambiente, bordes. Nunca datos. Si Acabados pintara sus etapas de
 * escarlata, quedaria a 1.16:1 de --danger y una etapa lenta se leeria como
 * error. Las escalas de las graficas se quedan como estan a proposito.
 */
export function MarcoEmpresa({ empresaId, children }: Props) {
  return (
    <div
      style={{
        ['--co' as string]: `var(--empresa-${empresaId})`,
        ['--ma' as string]: `var(--empresa-${empresaId}-masa)`,
      }}
    >
      {/* Filo superior a todo lo ancho. Es la senal periferica: se ve sin
          leer el titulo, que es justo el problema que resuelve. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-[3px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--co) 18%, var(--co) 82%, transparent)',
        }}
      />

      {/* Ambiente. Muy tenue y fijo al fondo: tine la pantalla sin competir
          con ningun dato. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(100% 46% at 50% 0%, color-mix(in srgb, var(--ma) 26%, transparent), transparent 70%)',
        }}
      />

      {children}
    </div>
  )
}
