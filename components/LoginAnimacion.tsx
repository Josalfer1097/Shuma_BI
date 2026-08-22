'use client'

/**
 * Animacion de carga del login.
 *
 * Tres hojas descienden una por una, reciben un sello y caen apilandose
 * en una charola. Un ciclo completo dura 15 segundos.
 *
 * Es SVG con animaciones CSS: sin librerias, sin GIF, sin video. El
 * navegador anima transform y opacity, que corren en el compositor y no
 * disparan reflow, asi que no compite con la hidratacion de la pagina.
 *
 * Con prefers-reduced-motion la animacion se detiene en su estado final:
 * las tres hojas apiladas en la charola. No desaparece, se queda quieta.
 *
 * Colores: variables de app/globals.css. No hay un solo hex aqui.
 */

export function LoginAnimacion({ tamano = 240 }: { tamano?: number }) {
  return (
    <div
      className="select-none"
      style={{ width: tamano, height: tamano, maxWidth: '100%' }}
      aria-hidden="true"
    >
      <style>{ANIMACION}</style>
      <svg viewBox="0 0 200 240" width="100%" height="100%" role="presentation">
        {/* Borde trasero de la charola. Va antes que las hojas para que
            estas caigan por delante de el. */}
        <rect
          x="44"
          y="170"
          width="112"
          height="10"
          rx="3"
          fill="var(--bg-surface)"
          stroke="var(--border)"
          strokeWidth="1"
        />

        <Hoja clase="la-h1" lineas={[44, 34, 40, 22]} />
        <Hoja clase="la-h2" lineas={[44, 30, 42, 26]} />
        <Hoja clase="la-h3" lineas={[44, 36, 28, 20]} />

        <Sello clase="la-s1" />
        <Sello clase="la-s2" />
        <Sello clase="la-s3" />

        {/* Frente de la charola. Se dibuja al final para tapar la base de
            la pila: las hojas asoman por encima del filo. */}
        <path
          d="M40 176h120v22a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6z"
          fill="var(--bg-elevated)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <path
          d="M40 176l14-14h92l14 14"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function Hoja({ clase, lineas }: { clase: string; lineas: number[] }) {
  return (
    <g className={`la-hoja ${clase}`}>
      <rect
        x="68"
        y="18"
        width="64"
        height="82"
        rx="4"
        fill="var(--bg-elevated)"
        stroke="var(--border)"
        strokeWidth="1"
      />
      {lineas.map((ancho, i) => (
        <rect
          key={i}
          x="78"
          y={32 + i * 12 + (i === 3 ? 12 : 0)}
          width={ancho}
          height="4"
          rx="2"
          fill={i === 0 || i === 3 ? 'var(--text-muted)' : 'var(--border)'}
        />
      ))}
    </g>
  )
}

function Sello({ clase }: { clase: string }) {
  return (
    <g className={`la-sello ${clase}`}>
      <circle
        cx="112"
        cy="74"
        r="15"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
      />
      <path
        d="M105 74l5 5 9-10"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/**
 * Las tres hojas comparten la coreografia pero NO se resuelve con
 * animation-delay: un delay correria el ciclo completo de cada hoja,
 * incluido el reposo, y las tres se desincronizarian. Cada una lleva sus
 * porcentajes escritos sobre el mismo ciclo de 15s.
 *
 * transform-box: fill-box hace que transform-origin: center se calcule
 * sobre la caja del propio grupo y no sobre el viewBox completo. Sin eso,
 * la hoja gira alrededor de la esquina del lienzo.
 */
const ANIMACION = `
.la-hoja, .la-sello { transform-box: fill-box; transform-origin: center; }
.la-h1 { animation: la-caida-1 15s linear infinite; }
.la-h2 { animation: la-caida-2 15s linear infinite; }
.la-h3 { animation: la-caida-3 15s linear infinite; }
.la-s1 { animation: la-marca-1 15s linear infinite; }
.la-s2 { animation: la-marca-2 15s linear infinite; }
.la-s3 { animation: la-marca-3 15s linear infinite; }

@keyframes la-caida-1 {
  0%   { opacity: 0; transform: translateY(-72px) rotate(-7deg); }
  3%   { opacity: 1; }
  9%   { opacity: 1; transform: translateY(0) rotate(0deg); }
  19%  { opacity: 1; transform: translateY(0) rotate(0deg); }
  25%  { transform: translateY(148px) rotate(2deg) scaleY(0.16); }
  100% { opacity: 1; transform: translateY(148px) rotate(2deg) scaleY(0.16); }
}
@keyframes la-caida-2 {
  0%   { opacity: 0; transform: translateY(-72px) rotate(-7deg); }
  33%  { opacity: 0; transform: translateY(-72px) rotate(-7deg); }
  36%  { opacity: 1; }
  42%  { opacity: 1; transform: translateY(0) rotate(0deg); }
  52%  { opacity: 1; transform: translateY(0) rotate(0deg); }
  58%  { transform: translateY(140px) rotate(-2deg) scaleY(0.16); }
  100% { opacity: 1; transform: translateY(140px) rotate(-2deg) scaleY(0.16); }
}
@keyframes la-caida-3 {
  0%   { opacity: 0; transform: translateY(-72px) rotate(-7deg); }
  66%  { opacity: 0; transform: translateY(-72px) rotate(-7deg); }
  69%  { opacity: 1; }
  75%  { opacity: 1; transform: translateY(0) rotate(0deg); }
  85%  { opacity: 1; transform: translateY(0) rotate(0deg); }
  91%  { transform: translateY(132px) rotate(1deg) scaleY(0.16); }
  100% { opacity: 1; transform: translateY(132px) rotate(1deg) scaleY(0.16); }
}

@keyframes la-marca-1 {
  0%, 10%   { opacity: 0; transform: scale(2.4); }
  13%       { opacity: 1; transform: scale(1.1); }
  15%       { transform: scale(0.9); }
  17%, 21%  { opacity: 1; transform: scale(1); }
  24%, 100% { opacity: 0; transform: scale(1); }
}
@keyframes la-marca-2 {
  0%, 43%   { opacity: 0; transform: scale(2.4); }
  46%       { opacity: 1; transform: scale(1.1); }
  48%       { transform: scale(0.9); }
  50%, 54%  { opacity: 1; transform: scale(1); }
  57%, 100% { opacity: 0; transform: scale(1); }
}
@keyframes la-marca-3 {
  0%, 76%   { opacity: 0; transform: scale(2.4); }
  79%       { opacity: 1; transform: scale(1.1); }
  81%       { transform: scale(0.9); }
  83%, 87%  { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .la-h1, .la-h2, .la-h3, .la-s1, .la-s2, .la-s3 { animation: none; }
  .la-h1 { opacity: 1; transform: translateY(148px) scaleY(0.16); }
  .la-h2 { opacity: 1; transform: translateY(140px) scaleY(0.16); }
  .la-h3 { opacity: 1; transform: translateY(132px) scaleY(0.16); }
  .la-s1, .la-s2, .la-s3 { opacity: 0; }
}
`
