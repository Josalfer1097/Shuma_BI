import { 
  SkeletonFiltros, 
  SkeletonKpiRow, 
  SkeletonGrafica, 
  SkeletonTabla 
} from '@/components/ui/Skeleton'

export default function LoadingVentas() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <SkeletonFiltros />
      </div>
      
      <div className="flex justify-end mb-4">
        {/* Skeleton para el panel de hallazgos, si es necesario. KpiRow va justo debajo. */}
        <div className="h-10 w-48 rounded-lg bg-bg-surface border border-border animate-pulse" />
      </div>

      <div className="space-y-3">
        <SkeletonKpiRow n={4} />
        <SkeletonKpiRow n={3} />
      </div>

      <div className="mt-8">
        <SkeletonGrafica />
      </div>

      <div className="mt-8">
        <SkeletonTabla filas={10} />
      </div>
    </div>
  )
}
