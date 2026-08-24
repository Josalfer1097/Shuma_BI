/**
 * El plano tecnico del login. NO es decoracion: es el estado de la aplicacion.
 *
 * En un plano de obra un error no es un mensaje, es una linea que no cierra.
 * Ese vocabulario ya lo entiende cualquiera que trabaje en construccion, y es
 * de esta empresa, no generico.
 *
 * Los cinco estados y lo que dice cada uno:
 *
 *   reposo       se traza, respira, se desvanece. Ciclo de 9 s.
 *   escribiendo  la reticula de fondo se aviva. El sistema esta atento.
 *   enviando     el trazo se acelera y no cierra: la obra sigue.
 *   exito        el plano cierra, la reticula se apaga, queda la figura.
 *   error        una linea llega al vertice, no conecta y se retrae.
 *
 * El estado de error importa mas de lo que parece. El mensaje de texto del
 * login es deliberadamente vago por seguridad —distinguir "no existe la
 * cuenta" de "contrasena incorrecta" convierte la pantalla en un verificador
 * de cuentas—, y eso hace que el sistema se sienta mudo. El plano comunica el
 * fallo sin revelar su causa: dice "no cerro", que es justo lo que se puede
 * decir.
 *
 * Toda la animacion vive en app/globals.css, seleccionada por el atributo
 * data-estado del <svg>. Aqui no hay logica de tiempos a proposito: un cambio
 * de ritmo no deberia obligar a recompilar un componente.
 *
 * Ninguna transicion se pierde con prefers-reduced-motion: cada estado tiene
 * su version estatica, no su ausencia.
 */

export type EstadoPlano = 'reposo' | 'escribiendo' | 'enviando' | 'exito' | 'error'

type LoginAnimacionProps = {
  tamano?: number
  estado?: EstadoPlano
}

export function LoginAnimacion({ tamano = 240, estado = 'reposo' }: LoginAnimacionProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={tamano}
      height={tamano}
      className="plano text-accent"
      data-estado={estado}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">

        {/* Reticula de fondo. Se aviva al escribir: es la unica senal de que
            el sistema esta atento antes de que el usuario envie nada. */}
        <g className="plano-reticula" strokeWidth="1">
          <line x1="20" y1="60" x2="180" y2="60" />
          <line x1="20" y1="100" x2="180" y2="100" />
          <line x1="20" y1="140" x2="180" y2="140" />
          <line x1="60" y1="20" x2="60" y2="180" />
          <line x1="100" y1="20" x2="100" y2="180" />
          <line x1="140" y1="20" x2="140" y2="180" />
        </g>

        {/* Los cuatro primeros trazos de la figura. */}
        <g strokeWidth="2" strokeOpacity="0.75">
          <path className="plano-trazo" style={{ animationDelay: '0ms' }} d="M60 140 L60 70" />
          <path className="plano-trazo" style={{ animationDelay: '450ms' }} d="M60 70 L100 44" />
          <path className="plano-trazo" style={{ animationDelay: '900ms' }} d="M100 44 L140 70" />
          <path className="plano-trazo" style={{ animationDelay: '1350ms' }} d="M140 70 L140 140" />
        </g>

        {/* El trazo de CIERRE, separado de los demas a proposito.
            Es la base de la figura: el ultimo que se dibuja y el unico que
            "cierra" el contorno. En estado de error es el que no llega. */}
        <g strokeWidth="2" strokeOpacity="0.75">
          <path className="plano-trazo plano-cierre" style={{ animationDelay: '1800ms' }} d="M60 140 L140 140" />
        </g>

        {/* Vano interior, en linea punteada como en un plano real. */}
        <g strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 4">
          <path className="plano-trazo" style={{ animationDelay: '2250ms' }} d="M86 140 L86 104 L114 104 L114 140" />
        </g>

        {/* Nodos de los vertices. */}
        <g fill="currentColor" stroke="none">
          <circle className="plano-nodo" style={{ animationDelay: '2600ms' }} cx="60" cy="70" r="2.5" />
          <circle className="plano-nodo" style={{ animationDelay: '2750ms' }} cx="100" cy="44" r="2.5" />
          <circle className="plano-nodo" style={{ animationDelay: '2900ms' }} cx="140" cy="70" r="2.5" />
        </g>

        {/* Nodo del vertice que NO conecta. Solo aparece en estado de error,
            justo donde el trazo de cierre se queda corto. */}
        <g fill="currentColor" stroke="none">
          <circle className="plano-nodo-roto" cx="140" cy="140" r="3" />
        </g>

      </g>
    </svg>
  )
}
