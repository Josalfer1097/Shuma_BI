import { Header } from '@/components/Header'
import { EmpresaCard } from '@/components/EmpresaCard'
import { EMPRESAS } from '@/lib/empresas'
import { obtenerSesion, empresasVisibles } from '@/lib/auth'

export const revalidate = 0

/**
 * Pagina de inicio: elegir empresa.
 *
 * Tiene una sola funcion, elegir, y por eso no muestra ninguna cifra: no
 * consulta la base de datos siquiera. El detalle vive un nivel adentro, en
 * /[empresa].
 *
 * Una cifra de logistica aqui envejeceria mal: cuando entren las demas areas
 * estaria representando a la empresa completa con el dato de una sola.
 */
export default async function Portada() {
  // La portada sigue sin consultar cifras. Lo unico que pide es la sesion,
  // para saber si dibuja "Entrar" o el nombre de quien ya entro.
  const sesion = await obtenerSesion()
  // El catalogo sigue siendo empresas.ts. Los permisos solo deciden cuales
  // de esas tarjetas se pintan, no cuales existen.
  const visibles = empresasVisibles(sesion, EMPRESAS)

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <Header
        titulo="Tablero Operativo"
        subtitulo="Grupo Shuma"
        conSelectorEmpresa={false}
        nombreSesion={sesion.perfil?.nombre ?? sesion.correo}
      />

      <p className="mb-8 text-scale-base text-text-secondary">
        {visibles.length > 0
          ? 'Elige una empresa para ver sus indicadores de operación.'
          : 'Tu perfil todavía no tiene empresas asignadas.'}
      </p>

      {visibles.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visibles.map((empresa, i) => {
            return <EmpresaCard key={empresa.id} empresa={empresa} indice={i} />
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-surface p-8 text-center">
          <p className="text-scale-base text-text-secondary">
            Escribe a sistemas indicando qué necesitas consultar.
          </p>
        </div>
      )}


    </main>
  )
}
