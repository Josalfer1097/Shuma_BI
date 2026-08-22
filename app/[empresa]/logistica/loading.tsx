import { 
  SkeletonKpiRow, 
  SkeletonGrafica, 
  SkeletonTabla,
  Skeleton
} from '@/components/ui/Skeleton'

export default function LoadingLogistica() {
  return (
    <div className="animate-in fade-in duration-500">
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
    </div>
  )
}
