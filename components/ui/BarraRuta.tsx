export function BarraRuta() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden pointer-events-none"
      role="progressbar"
      aria-label="Cargando contenido"
    >
      <div className="barra-ruta h-full w-full origin-left bg-accent" />
    </div>
  )
}
