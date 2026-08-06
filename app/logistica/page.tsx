import { redirect } from 'next/navigation'
import { EMPRESA_POR_DEFECTO } from '@/lib/empresas'

export default function LogisticaRedirect() {
  redirect(`/${EMPRESA_POR_DEFECTO}/logistica`)
}
