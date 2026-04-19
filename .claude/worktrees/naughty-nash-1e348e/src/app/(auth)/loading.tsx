import { Loader2 } from 'lucide-react'

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[#2DC814] animate-spin" />
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    </div>
  )
}
