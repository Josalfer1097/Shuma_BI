'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, KeyRound, Loader2 } from 'lucide-react'
import { crearClienteNavegador } from '@/lib/supabase-browser'

type Modo = 'enlace' | 'password'

/**
 * Pantalla de acceso.
 *
 * Dos metodos sobre el mismo usuario: enlace al correo y contrasena. Direccion
 * entra una vez al mes y olvidaria una contrasena; quien usa el tablero a
 * diario prefiere no esperar un correo.
 *
 * El mensaje de error es deliberadamente vago. Decir "ese correo no existe"
 * convierte la pantalla en un verificador de cuentas para cualquiera.
 */
function FormularioLogin() {
  const router = useRouter()
  const parametros = useSearchParams()
  const destino = parametros.get('next') || '/'

  const [modo, setModo] = useState<Modo>('enlace')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

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
        // refresh y no solo push: el Server Component tiene que volver a
        // consultar con la cookie nueva, si no muestra el estado anterior.
        router.push(destino)
        router.refresh()
      }
    } catch {
      setError('No pudimos validar esos datos. Revisa el correo y la contraseña.')
    } finally {
      setCargando(false)
    }
  }

  const listo = modo === 'enlace' ? correo.includes('@') : correo.includes('@') && password.length > 0

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-neuropol text-scale-3xl text-text-primary tracking-wide">SHUMA</h1>
          <p className="text-scale-sm text-text-muted mt-2">Tablero operativo</p>
        </div>

        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <div className="flex gap-1 p-1 mb-6 bg-bg-elevated rounded-md">
            <button
              type="button"
              onClick={() => {
                setModo('enlace')
                setError(null)
                setEnviado(false)
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-scale-sm transition-colors ${
                modo === 'enlace'
                  ? 'bg-accent-deep text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Mail size={16} aria-hidden="true" />
              Enlace al correo
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('password')
                setError(null)
                setEnviado(false)
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-scale-sm transition-colors ${
                modo === 'password'
                  ? 'bg-accent-deep text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <KeyRound size={16} aria-hidden="true" />
              Contraseña
            </button>
          </div>

          {enviado ? (
            <div className="text-center py-4">
              <p className="text-scale-base text-text-primary">Revisa tu correo</p>
              <p className="text-scale-sm text-text-secondary mt-2">
                Mandamos un enlace de acceso a {correo}. Caduca en una hora.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="correo" className="block text-scale-sm text-text-secondary mb-1">
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && listo && !cargando) enviar()
                  }}
                  className="w-full px-3 py-2 rounded bg-bg-elevated border border-border text-text-primary text-scale-base focus:outline-none focus:border-accent"
                />
              </div>

              {modo === 'password' && (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-scale-sm text-text-secondary mb-1"
                  >
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && listo && !cargando) enviar()
                    }}
                    className="w-full px-3 py-2 rounded bg-bg-elevated border border-border text-text-primary text-scale-base focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="text-scale-sm text-danger">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={!listo || cargando}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-accent-deep text-white text-scale-base disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
              >
                {cargando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {modo === 'enlace' ? 'Mandarme el enlace' : 'Entrar'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-scale-xs text-text-muted mt-6">
          ¿Sin acceso? Escribe a sistemas.
        </p>
      </div>
    </main>
  )
}

/**
 * useSearchParams obliga a renderizado en cliente. Sin este limite de
 * Suspense, Next falla al prerenderizar /login en el build. El fallback es
 * la misma caja vacia para que no haya salto de layout.
 */
export default function Login() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
          <div className="w-full max-w-md h-80 rounded-lg border border-border bg-bg-surface" />
        </main>
      }
    >
      <FormularioLogin />
    </Suspense>
  )
}
