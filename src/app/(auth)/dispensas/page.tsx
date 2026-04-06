import { DispensasHistorial } from '@/components/tables/DispensasHistorial'

export default function DispensasPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dispensas</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Historial inmutable — los registros no pueden modificarse ni eliminarse
        </p>
      </div>
      <DispensasHistorial />
    </div>
  )
}
