import { SkeletonKpiRow, SkeletonTabla, SkeletonEstilos } from '@/components/ui/Skeleton'
import { BarraRuta } from '@/components/ui/BarraRuta'

export default function Loading() {
  return (
    <div className="space-y-8 p-6">
      <BarraRuta />
      <SkeletonEstilos />
      <SkeletonKpiRow n={2} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <SkeletonTabla filas={5} />
        <SkeletonTabla filas={5} />
      </div>
    </div>
  )
}
