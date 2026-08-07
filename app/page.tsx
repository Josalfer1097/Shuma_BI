import { Header } from '@/components/Header'
import { EmpresaCard } from '@/components/EmpresaCard'
import { EMPRESAS } from '@/lib/empresas'

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
export default function Portada() {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <Header titulo="Tablero Operativo" subtitulo="Grupo Shuma" conSelectorEmpresa={false} />

      <p className="mb-8 text-scale-base text-text-secondary">
        Elige una empresa para ver sus indicadores de operación.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {EMPRESAS.map((empresa, i) => {
          return <EmpresaCard key={empresa.id} empresa={empresa} indice={i} />
        })}
      </div>


    </main>
  )
}
