'use client'

interface Props {
  empresaId: string
  /**
   * Alto del logotipo. Acepta numero (pixeles) o cadena CSS.
   *
   * Se usa con clamp() para que escale con el ancho de la pantalla: a 76 px
   * el logotipo de Acabados mide 313 px de ancho, que no cabe en un telefono
   * de 320 px. Con clamp encoge solo, sin puntos de corte.
   */
  alto?: number | string
  className?: string
}

/**
 * Logo de la empresa, recoloreado segun el tema.
 *
 * El PNG aporta la FORMA y el tema aporta el COLOR, via mask-image sobre el
 * canal alfa. Es el tratamiento estandar para logotipos de un solo color y
 * resuelve un problema que una etiqueta <img> no puede resolver:
 *
 *   el logo de CFS es marino #232F60, que sobre el fondo oscuro del tablero
 *   da 1.36:1. Invisible. El de Acabados da 3.40:1, por debajo del minimo.
 *
 * Con mascara, el trazo se pinta con --co, que ya esta medido para el tema
 * activo: 7.61:1 en oscuro y 11.55:1 en claro. Las letras son exactamente
 * las del manual de marca; solo cambia el color, que es justo lo que hace
 * una version negativa del logotipo.
 *
 * Si algun dia llega el archivo en version clara, esto se sustituye por un
 * <img> y se acabo.
 */
export function LogoEmpresa({ empresaId, alto = 28, className }: Props) {
  const archivo = empresaId === 'cfs' ? '/logo/cfs.png' : '/logo/ash.png'

  return (
    <span
      role="img"
      aria-label={empresaId === 'cfs' ? 'Comercializadora y Ferretería Shuma' : 'Acabados Shuma'}
      // display sale del className y no del estilo en linea: un estilo en
      // linea gana sobre la clase de Tailwind, y con inline-block el logo
      // caia en el mismo renglon que el enlace de volver.
      className={`block ${className ?? ''}`}
      style={{
        height: alto,
        // Proporcion real de cada archivo ya recortado, para que los dos
        // ocupen el mismo alto sin deformarse.
        aspectRatio: empresaId === 'cfs' ? '3.87' : '4.12',
        backgroundColor: 'var(--co, var(--accent))',
        WebkitMask: `url(${archivo}) center / contain no-repeat`,
        mask: `url(${archivo}) center / contain no-repeat`,
      }}
    />
  )
}
