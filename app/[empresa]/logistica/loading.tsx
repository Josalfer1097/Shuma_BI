import { 
  SkeletonKpiRow, 
  SkeletonGrafica, 
  SkeletonTabla,
  Skeleton,
  SkeletonEstilos
} from '@/components/ui/Skeleton'
import { BarraRuta } from '@/components/ui/BarraRuta'

export default function LoadingLogistica() {
  return (
    <>
      <BarraRuta />
      <SkeletonEstilos />
      <Skeleton className="h-16 w-full mb-8" />
      
      <div className="mb-8">
        <SkeletonKpiRow n={4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <SkeletonGrafica alto={384} />
        <SkeletonGrafica alto={400} />
      </div>

      <div>
        <SkeletonTabla filas={6} />
      </div>
    </>
  )
}
