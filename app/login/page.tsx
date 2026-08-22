'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, KeyRound, ArrowRight, Check } from 'lucide-react'
import { crearClienteNavegador } from '@/lib/supabase-browser'
import { FondoAcceso } from '@/components/FondoAcceso'
import { LoginAnimacion } from '@/components/LoginAnimacion'
import { PantallaCarga } from '@/components/ui/PantallaCarga'

type Modo = 'enlace' | 'password'

const ESQUINAS = [
  'left-0 top-0 border-l border-t',
  'right-0 top-0 border-r border-t',
  'left-0 bottom-0 border-b border-l',
  'right-0 bottom-0 border-b border-r',
]

function FormularioAcceso() {
  const router = useRouter()
  const parametros = useSearchParams()
  const destino = parametros.get('next') || '/'

  const [modo, setModo] = useState<Modo>('enlace')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
    setEnviado(false)
  }

  async function enviar() {
    setError(null)
    setCargando(true)
    const supabase = crearClienteNavegador()

    try {
      if (modo === 'enlace') {
        const { error: fallo } = await supabase.auth.signInWithOtp({
          email: correo.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
          },
        })
        if (fallo) throw fallo
        setEnviado(true)
      } else {
        const { error: fallo } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password,
        })
        if (fallo) throw fallo
        // Estado intermedio antes de navegar: sin el, la pantalla se queda
        // congelada medio segundo y parece que el boton no respondio.
        setEntrando(true)
        router.push(destino)
        router.refresh()
      }
    } catch {
      // Mensaje deliberadamente vago. Distinguir "correo no existe" de
      // "contrasena incorrecta" convierte la pantalla en un verificador de
      // cuentas para cualquiera que la visite.
      setError('No pudimos validar esos datos. Revisa el correo y la contraseña.')
      setCargando(false)
      return
    }
    setCargando(false)
  }

  const listo =
    modo === 'enlace' ? correo.includes('@') : correo.includes('@') && password.length > 0

  const claseCampo =
    'campo-acceso w-full rounded-lg border border-border/70 bg-bg-base/50 px-3.5 py-3 text-scale-base text-text-primary backdrop-blur placeholder:text-text-muted'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base p-4">
      <FondoAcceso />

      <div className="w-full max-w-md">
        <div
          className="animar-entrada mb-9 text-center"
          style={{ animationDelay: '0.05s' }}
        >
          <p className="mb-3 font-mono text-scale-xs uppercase tracking-[0.3em] text-text-muted">
            <span className="text-accent">{'//'}</span> acceso
          </p>
          <div className="flex justify-center mb-6">
            <LoginAnimacion tamano={200} />
          </div>
          <h1 className="font-neuropol text-scale-4xl tracking-[0.18em] text-text-primary drop-shadow-[0_2px_20px_var(--accent)]">
            SHUMA
          </h1>
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-px w-24"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--empresa-cfs), var(--empresa-acabados), transparent)',
            }}
          />
          <p className="mt-3 text-scale-sm text-text-secondary">Tablero operativo</p>
        </div>

        <div
          className="vidrio animar-entrada relative rounded-2xl p-8"
          style={{ animationDelay: '0.18s' }}
        >
          {ESQUINAS.map((pos, i) => (
            <span
              key={pos}
              aria-hidden="true"
              className={`animar-marco pointer-events-none absolute border-accent ${pos}`}
              style={{ animationDelay: `${0.5 + i * 0.09}s` }}
            />
          ))}

          {/* Selector de metodo. El indicador se desliza en vez de saltar:
              es la transicion que hace sentir la pantalla continua. */}
          <div className="relative mb-8 grid grid-cols-2 rounded-lg border border-border/50 bg-bg-base/45 p-1 backdrop-blur">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-accent-deep shadow-[0_4px_14px_-6px_var(--accent)] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: modo === 'password' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              onClick={() => cambiarModo('enlace')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded py-2 text-scale-sm transition-colors duration-300 ${
                modo === 'enlace' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Mail size={15} aria-hidden="true" />
              Enlace
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('password')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded py-2 text-scale-sm transition-colors duration-300 ${
                modo === 'password' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <KeyRound size={15} aria-hidden="true" />
              Contraseña
            </button>
          </div>

          {enviado ? (
            <div className="animar-entrada py-6 text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-success/40 bg-success/10">
                <Check size={20} className="text-success" aria-hidden="true" />
              </div>
              <p className="text-scale-base text-text-primary">Revisa tu correo</p>
              <p className="mt-2 text-scale-sm text-text-secondary">
                Mandamos un enlace de acceso a {correo}. Caduca en una hora.
              </p>
              <button
                type="button"
                onClick={() => setEnviado(false)}
                className="mt-5 text-scale-sm text-accent transition-opacity hover:opacity-80"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="animar-entrada" style={{ animationDelay: '0.3s' }}>
                <label
                  htmlFor="correo"
                  className="mb-1.5 block font-mono text-scale-xs uppercase tracking-[0.16em] text-text-muted"
                >
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@shuma.mx"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && listo && !cargando) enviar()
                  }}
                  className={claseCampo}
                />
              </div>

              {/* Rejilla de altura animada en vez de montar y desmontar: el
                  campo crece en lugar de aparecer de golpe. */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
                style={{
                  gridTemplateRows: modo === 'password' ? '1fr' : '0fr',
                  opacity: modo === 'password' ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <label
                    htmlFor="password"
                    className="mb-1.5 block font-mono text-scale-xs uppercase tracking-[0.16em] text-text-muted"
                  >
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    tabIndex={modo === 'password' ? 0 : -1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && listo && !cargando) enviar()
                    }}
                    className={claseCampo}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="animar-entrada text-scale-sm text-danger">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={!listo || cargando || entrando}
                className="boton-acceso animar-entrada group mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-scale-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                style={{ animationDelay: '0.4s' }}
              >
                {entrando || (cargando && modo === 'password')
                  ? 'Entrando…'
                  : cargando && modo === 'enlace'
                    ? 'Enviando…'
                    : modo === 'enlace'
                      ? 'Mandarme el enlace'
                      : 'Entrar'}
                {!cargando && !entrando && (
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                )}
              </button>
            </div>
          )}
        </div>

        <p
          className="animar-entrada mt-7 text-center font-mono text-scale-xs tracking-[0.14em] text-text-muted"
          style={{ animationDelay: '0.55s' }}
        >
          ¿SIN ACCESO? ESCRIBE A SISTEMAS
        </p>
      </div>
      <PantallaCarga activo={entrando} />
    </main>
  )
}

/**
 * useSearchParams obliga a renderizado en cliente. Sin este limite de
 * Suspense, Next falla al prerenderizar /login durante el build.
 */
export default function Login() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-bg-base p-4">
          <div className="h-96 w-full max-w-md rounded-lg border border-border bg-bg-surface" />
        </main>
      }
    >
      <FormularioAcceso />
    </Suspense>
  )
}
