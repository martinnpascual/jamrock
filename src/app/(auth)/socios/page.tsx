import { Suspense } from 'react'
import { MembersTable } from '@/components/tables/MembersTable'
import { Skeleton } from '@/components/ui/skeleton'

export default function SociosPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Socios</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de socios, estados REPROCANN y carnets digitales
        </p>
      </div>
      <Suspense fallback={
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      }>
        <MembersTable />
      </Suspense>
    </div>
  )
}
