'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, KeyRound, ArrowRight, Check } from 'lucide-react'
import { crearClienteNavegador } from '@/lib/supabase-browser'
import { FondoAcceso } from '@/components/FondoAcceso'
import { LoginAnimacion, type EstadoPlano } from '@/components/LoginAnimacion'
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
  /**
   * Tono del error, no solo su texto.
   *
   * "Espera un minuto" y "no es tu cuenta, avisa a sistemas" no son la misma
   * clase de problema y no deben verse igual de rojos. `aviso` es algo que se
   * resuelve solo con tiempo; `falla` no depende del usuario.
   */
  const [tonoError, setTonoError] = useState<'falla' | 'aviso'>('falla')
  /** Segundos que faltan para poder reintentar tras un 429. */
  const [espera, setEspera] = useState(0)

  /**
   * Cuenta regresiva del limite de envio.
   *
   * Supabase impone 60 s entre correos al mismo usuario. Mostrar el numero
   * corriendo convierte una espera opaca en una espera entendida: el usuario
   * deja de darle al boton cada dos segundos.
   */
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  /**
   * Corregir es intentar de nuevo.
   *
   * Sin esto el plano se queda roto mientras el usuario reescribe su correo,
   * y la pantalla sigue senalando un fallo que ya esta corrigiendo. La espera
   * del 429 NO se limpia aqui: esa no depende de lo que el usuario escriba.
   */
  function alEscribir(fn: (v: string) => void) {
    return (v: string) => {
      if (error) setError(null)
      fn(v)
    }
  }

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
    } catch (fallo) {
      // Mensaje deliberadamente vago para el caso de credenciales. Distinguir
      // "correo no existe" de "contrasena incorrecta" convierte la pantalla en
      // un verificador de cuentas para cualquiera que la visite.
      //
      // Pero un fallo de INFRAESTRUCTURA no es un fallo de credenciales, y
      // decirle al usuario que revise su contrasena cuando en modo enlace no
      // hay ninguna lo manda a buscar un problema que no existe. Peor: en modo
      // enlace no hay nada que el usuario pueda hacer, y el mensaje sugiere
      // que si.
      //
      // Estos dos codigos no filtran nada sobre si la cuenta existe:
      //   429 -> limite de envio de correos alcanzado
      //   5xx -> el SMTP configurado rechazo o no respondio
      const estado =
        typeof fallo === 'object' && fallo !== null && 'status' in fallo
          ? Number((fallo as { status?: unknown }).status)
          : 0

      if (estado === 429) {
        // Aviso, no falla: se resuelve solo con esperar. El texto no lleva el
        // numero porque la cuenta regresiva se pinta aparte y se mueve.
        setTonoError('aviso')
        setEspera(60)
        setError('Ya se mando un enlace hace poco.')
      } else if (estado >= 500) {
        setTonoError('falla')
        setError('No pudimos mandar el correo. No es tu cuenta: avisa a sistemas.')
      } else if (modo === 'enlace') {
        setTonoError('falla')
        setError('No pudimos mandar el enlace. Revisa que el correo este bien escrito.')
      } else {
        setTonoError('falla')
        setError('No pudimos validar esos datos. Revisa el correo y la contrasena.')
      }

      setCargando(false)
      return
    }
    setCargando(false)
  }

  /**
   * El estado del plano se DERIVA, no se guarda aparte.
   *
   * Un useState propio para la animacion podria desincronizarse del estado
   * real del formulario y mostrar un plano cerrado sobre un error, o al reves.
   * Derivarlo hace imposible esa clase de bug.
   *
   * El orden importa: exito y fallo mandan sobre todo lo demas.
   */
  const estadoPlano: EstadoPlano = enviado
    ? 'exito'
    : error
      ? 'error'
      : cargando || entrando
        ? 'enviando'
        : correo.length > 0 || password.length > 0
          ? 'escribiendo'
          : 'reposo'

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
            <LoginAnimacion tamano={200} estado={estadoPlano} />
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
                  onChange={(e) => alEscribir(setCorreo)(e.target.value)}
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
                    onChange={(e) => alEscribir(setPassword)(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && listo && !cargando) enviar()
                    }}
                    className={claseCampo}
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className={`animar-entrada text-scale-sm ${
                    tonoError === 'aviso' ? 'text-warning' : 'text-danger'
                  }`}
                >
                  {error}
                  {espera > 0 && (
                    <>
                      {' '}
                      <span className="tabular-nums text-text-muted">
                        Puedes reintentar en {espera} s.
                      </span>
                    </>
                  )}
                </p>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={!listo || cargando || entrando || espera > 0}
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
