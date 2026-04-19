import { DispensasHistorial } from '@/components/tables/DispensasHistorial'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DispensasPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dispensas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Historial inmutable — los registros no pueden modificarse ni eliminarse
          </p>
        </div>
        <Link href="/dispensas/nueva">
          <Button className="bg-[#2DC814] hover:bg-[#25a811] text-black font-bold gap-2 h-9">
            <Plus className="w-4 h-4" />
            Nueva dispensa
          </Button>
        </Link>
      </div>
      <DispensasHistorial />
    </div>
  )
}
