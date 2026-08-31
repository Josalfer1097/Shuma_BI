/**
 * El ojo del campo de contrasena, dibujado como pieza de plano.
 *
 * No es un icono de libreria. El resto de la pantalla habla el vocabulario de
 * un plano tecnico —el trazo que cierra, la reticula, las esquinas de marco— y
 * un ojo generico de lucide seria el unico elemento que viene de otro lado.
 *
 * La lente son dos arcos. El iris es un circulo con cuatro marcas de compas.
 * Al ocultar, la linea de corte no aparece: se traza de vertice a vertice, que
 * es como se anota un corte en un plano. Al revelar, se retrae por donde vino.
 *
 * El trazado vive en app/globals.css sobre .ojo-corte y se dispara con el
 * atributo data-oculto. Aqui no hay tiempos: cambiar el ritmo de la animacion
 * no deberia obligar a recompilar un componente.
 *
 * Con prefers-reduced-motion la linea sigue estando, simplemente ya esta
 * dibujada. El estado nunca se pierde, solo la transicion.
 */

type OjoPlanoProps = {
  /** true cuando la contrasena esta oculta: la linea de corte esta puesta. */
  oculto: boolean
  /** Lado del cuadro en px. */
  tamano?: number
}

export function OjoPlano({ oculto, tamano = 18 }: OjoPlanoProps) {
  return (
    <svg
      className="ojo-plano"
      data-oculto={oculto ? 'si' : 'no'}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Lente: dos arcos que se encuentran en los vertices. */}
      <path className="ojo-lente" d="M2.2 12C4.8 7.6 8.2 5.4 12 5.4s7.2 2.2 9.8 6.6" />
      <path className="ojo-lente" d="M21.8 12c-2.6 4.4-6 6.6-9.8 6.6S4.8 16.4 2.2 12" />

      {/* Iris y marcas de compas: la pieza medida del dibujo. */}
      <circle className="ojo-iris" cx="12" cy="12" r="3.1" />
      <path className="ojo-marcas" d="M12 7.6v1.1M12 15.3v1.1M7.6 12h1.1M15.3 12h1.1" />

      {/* Linea de corte. Se traza sola; el dasharray esta en el CSS. */}
      <path className="ojo-corte" d="M3.4 20.6 20.6 3.4" />
    </svg>
  )
}
