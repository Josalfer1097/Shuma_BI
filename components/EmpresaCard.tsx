import React from 'react'
import Link from 'next/link'
import type { Empresa } from '@/lib/empresas'

/**
 * Tarjeta de empresa en la pagina de inicio.
 *
 * Representa una empresa completa, no un area: por eso no lleva cifras. Con
 * credito y cobranza, ventas y compras por entrar, un dato de logistica aqui
 * estaria hablando por todas.
 *
 * El lenguaje visual es tecnico y no decorativo: marcos de esquina, reticula
 * fina, anotaciones monoespaciadas y un resplandor contenido en el color de
 * la empresa.
 *
 * La portada es un menu, no una pantalla de datos, asi que aqui si cabe
 * cargar la identidad. Los modulos se quedan sobrios a proposito: este mismo
 * tratamiento sobre una grafica de entregas estorbaria la lectura.
 *
 * Las siglas van en Neuropol, la tipografia de identidad del grupo.
 */
export function EmpresaCard({ empresa, indice }: { empresa: Empresa; indice: number }) {
  const color = `var(--empresa-${empresa.id})`

  return (
    <Link
      href={`/${empresa.id}`}
      aria-label={`Ver indicadores de ${empresa.nombre}`}
      style={{ ['--co' as string]: color }}
      className="group relative isolate flex min-h-[17rem] flex-col justify-between overflow-hidden rounded-lg border border-border bg-bg-surface p-7 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-[color:var(--co)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* Reticula tecnica de fondo. Muy tenue: da superficie sin competir. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] transition-opacity duration-500 group-hover:opacity-[0.1]"
        style={{
          backgroundImage:
            'linear-gradient(var(--co) 1px, transparent 1px), linear-gradient(90deg, var(--co) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />

      {/* Resplandor bajo las siglas. Es el unico efecto de luz y esta
          contenido a una esquina, no repartido por toda la tarjeta. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-64 w-64 rounded-full opacity-[0.16] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.34]"
        style={{ backgroundColor: color }}
      />

      {/* Marcos de esquina. Crecen al pasar el cursor: es el gesto que
          confirma que la tarjeta responde, sin animar nada mas. */}
      {[
        'left-3 top-3 border-l border-t',
        'right-3 top-3 border-r border-t',
        'left-3 bottom-3 border-b border-l',
        'right-3 bottom-3 border-b border-r',
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`pointer-events-none absolute h-4 w-4 transition-all duration-500 group-hover:h-7 group-hover:w-7 ${pos}`}
          style={{ borderColor: color }}
        />
      ))}

      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-scale-xs uppercase tracking-[0.18em] text-text-muted">
          <span style={{ color }}>{'//'}</span> empresa {String(indice + 1).padStart(2, '0')}
        </p>
        {/* La plaza y no un detalle de logistica: la tarjeta representa a la
            empresa completa, y cuando entren credito y cobranza o ventas, una
            etiqueta de reparto estaria hablando por todas. */}
        <p className="font-mono text-scale-xs tracking-[0.18em]" style={{ color }}>
          {empresa.plaza}
        </p>
      </div>

      <div>
        <p
          className="font-neuropol leading-none tracking-[0.06em] transition-transform duration-500 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
          style={{ color, fontSize: 'calc(var(--font-4xl) * 1.5)' }}
        >
          {empresa.siglas}
        </p>
        <span
          aria-hidden="true"
          className="mb-4 mt-4 block h-px w-full"
          style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
        />
        <h2 className="font-exo text-scale-lg font-semibold leading-tight text-text-primary">
          {empresa.nombre}
        </h2>
      </div>

      <p className="font-mono text-scale-xs tracking-[0.14em] text-text-muted transition-colors group-hover:text-[color:var(--co)]">
        ver indicadores{' '}
        <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
          &rarr;
        </span>
      </p>
    </Link>
  )
}
