export function LoginAnimacion({ tamano = 240 }: { tamano?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={tamano}
      height={tamano}
      className="text-accent"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <g strokeOpacity="0.12" strokeWidth="1">
          <line x1="20" y1="60" x2="180" y2="60" />
          <line x1="20" y1="100" x2="180" y2="100" />
          <line x1="20" y1="140" x2="180" y2="140" />
          <line x1="60" y1="20" x2="60" y2="180" />
          <line x1="100" y1="20" x2="100" y2="180" />
          <line x1="140" y1="20" x2="140" y2="180" />
        </g>

        <g strokeWidth="2" strokeOpacity="0.75">
          <path className="plano-trazo" style={{ animationDelay: '0ms' }} d="M60 140 L60 70" />
          <path className="plano-trazo" style={{ animationDelay: '450ms' }} d="M60 70 L100 44" />
          <path className="plano-trazo" style={{ animationDelay: '900ms' }} d="M100 44 L140 70" />
          <path className="plano-trazo" style={{ animationDelay: '1350ms' }} d="M140 70 L140 140" />
          <path className="plano-trazo" style={{ animationDelay: '1800ms' }} d="M60 140 L140 140" />
        </g>

        <g strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 4">
          <path
            className="plano-trazo"
            style={{ animationDelay: '2250ms' }}
            d="M86 140 L86 104 L114 104 L114 140"
          />
        </g>

        <g fill="currentColor" stroke="none">
          <circle className="plano-nodo" style={{ animationDelay: '2600ms' }} cx="60" cy="70" r="2.5" />
          <circle className="plano-nodo" style={{ animationDelay: '2750ms' }} cx="100" cy="44" r="2.5" />
          <circle className="plano-nodo" style={{ animationDelay: '2900ms' }} cx="140" cy="70" r="2.5" />
        </g>
      </g>
    </svg>
  )
}
