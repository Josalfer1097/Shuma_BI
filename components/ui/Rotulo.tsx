import type { ReactNode } from 'react'

/**
 * Rotulo de seccion: versalitas con tracking amplio en la tipografia Exo.
 *
 * Existe porque el modulo de ventas usaba dos niveles tipograficos de los ocho
 * definidos (72 de 76 usos eran `sm` o `xs`) y ninguna de las dos familias
 * secundarias. Sin un nivel por encima del cuerpo y por debajo del titulo, todo
 * pesa igual y el ojo no sabe donde empezar.
 *
 * No es decoracion: marca donde empieza un bloque de sentido. Si un rotulo no
 * encabeza nada, sobra.
 */

type RotuloProps = {
  children: ReactNode
  className?: string
}

export function Rotulo({ children, className }: RotuloProps) {
  return (
    <span
      className={`block font-exo text-scale-xs uppercase tracking-[0.18em] text-text-muted ${className ?? ''}`}
    >
      {children}
    </span>
  )
}
