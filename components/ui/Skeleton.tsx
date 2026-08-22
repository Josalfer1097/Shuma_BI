/**
 * Esqueletos de carga.
 *
 * Segunda version. La primera usaba animate-pulse en cada bloque y una
 * grafica falsa de doce barras de alturas distintas: se leia como
 * contenido roto generandose, no como contenido por llegar. El problema
 * no era el pulso, era la cantidad de elementos animandose a la vez y la
 * silueta demasiado parecida a una grafica real a medio dibujar.
 *
 * Ahora hay una sola animacion, un barrido de luz que cruza el bloque de
 * izquierda a derecha. Un movimiento constante en una direccion se lee
 * como progreso; muchos elementos latiendo se lee como falla.
 *
 * Reglas de uso:
 * 1. El esqueleto debe medir lo mismo que el contenido que reemplaza, o
 *    la pagina salta al cargar y eso molesta mas que la espera.
 * 2. Menos formas, no mas. Un bloque con la silueta correcta comunica
 *    mejor que una maqueta detallada de lo que viene.
 */

const BARRIDO = `
.sk {
  position: relative;
  overflow: hidden;
  background: var(--bg-elevated);
  border-radius: 0.5rem;
}
.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 100%
  );
  animation: sk-barrido 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .sk::after { animation: none; }
}
@keyframes sk-barrido {
  100% { transform: translateX(100%); }
}
`

/**
 * Inyecta la animacion. Va UNA vez por pantalla, en el loading.tsx.
 * Ponerla en cada bloque duplicaria la regla decenas de veces.
 */
export function SkeletonEstilos() {
  return <style>{BARRIDO}</style>
}

export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <div className={`sk ${className}`} style={style} aria-hidden="true" />
}

/**
 * Tarjeta de KPI: etiqueta, cifra, pie. Nada mas.
 *
 * Dibujar el icono de ayuda y el borde de acento seria maqueta, no
 * esqueleto. El esqueleto marca el espacio, no imita el contenido.
 */
export function SkeletonKpi() {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-2.5 w-20" />
    </div>
  )
}

export function SkeletonKpiRow({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  )
}

export function SkeletonFiltros() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Grafica: un solo bloque con la altura real del area de dibujo, mas
 * titulo y leyenda.
 *
 * Sin barras ni curvas. Una grafica falsa a medio dibujar es justo lo
 * que hacia ver el estado de carga como un error de renderizado.
 */
export function SkeletonGrafica({ alto = 320 }: { alto?: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-6 w-full" style={{ height: alto - 110 }} />
      <div className="mt-4 flex items-center justify-center gap-6">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  )
}

/**
 * Tabla. Las filas se atenuan hacia abajo: el ojo entiende que la lista
 * continua y el bloque no compite con lo de arriba, que es lo primero
 * que va a llegar.
 */
export function SkeletonTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface">
      <div className="flex items-center justify-between p-5">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="border-t border-border">
        {Array.from({ length: filas }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
            style={{ opacity: Math.max(0.25, 1 - i * 0.14) }}
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
