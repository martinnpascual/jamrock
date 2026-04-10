'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity, Package, DollarSign, Users, ShoppingCart, Lock,
  FileText, Truck, Calendar, ClipboardCheck, Settings, CreditCard,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ActivityEntry = {
  id: string
  user_id: string
  user_name: string
  action: string
  entity: string
  entity_id: string | null
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

const ENTITY_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'checkout', label: 'Dispensas' },
  { value: 'caja', label: 'Caja' },
  { value: 'venta', label: 'Ventas' },
  { value: 'pago', label: 'Pagos' },
  { value: 'socio', label: 'Socios' },
  { value: 'stock', label: 'Stock' },
  { value: 'solicitud', label: 'Solicitudes' },
]

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  checkout: Package,
  dispensa: Package,
  caja: Lock,
  venta: ShoppingCart,
  pago: DollarSign,
  socio: Users,
  stock: FileText,
  producto: ShoppingCart,
  proveedor: Truck,
  evento: Calendar,
  solicitud: ClipboardCheck,
  config: Settings,
  cuenta_corriente: CreditCard,
}

const ACTION_COLORS: Record<string, string> = {
  crear: 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10',
  dispensar: 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10',
  abrir: 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10',
  aprobar: 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10',
  pagar: 'text-sky-400 border-sky-400/20 bg-sky-400/10',
  editar: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
  reabrir: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
  cerrar: 'text-slate-400 border-white/10 bg-white/5',
  eliminar: 'text-red-400 border-red-400/20 bg-red-400/10',
  anular: 'text-red-400 border-red-400/20 bg-red-400/10',
  rechazar: 'text-red-400 border-red-400/20 bg-red-400/10',
  reversar: 'text-red-400 border-red-400/20 bg-red-400/10',
}

function useActivity(entity: string, limit: number) {
  return useQuery({
    queryKey: ['activity', entity, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (entity !== 'todos') params.set('entity', entity)
      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) throw new Error('Error')
      const json = await res.json()
      return json.activities as ActivityEntry[]
    },
    refetchInterval: 30_000,
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  if (hours < 24) return `Hace ${hours}h`

  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`

  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ActividadPage() {
  const [entity, setEntity] = useState('todos')
  const [limit, setLimit] = useState(50)
  const { data: activities = [], isLoading } = useActivity(entity, limit)

  // Group by day
  const grouped = activities.reduce<Record<string, ActivityEntry[]>>((acc, a) => {
    const day = new Date(a.created_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[day]) acc[day] = []
    acc[day].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2DC814]" />
          Historial de actividad
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Registro de todas las acciones en el sistema</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {ENTITY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setEntity(f.value); setLimit(50) }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              entity === f.value
                ? 'bg-[#2DC814]/10 border-[#2DC814]/50 text-[#2DC814]'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && activities.length === 0 && (
        <div className="flex flex-col items-center py-16">
          <Activity className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">Sin actividad registrada</p>
          <p className="text-xs text-slate-500 mt-1">Las acciones aparecerán aquí a medida que se usen las funciones</p>
        </div>
      )}

      {/* Timeline grouped by day */}
      {!isLoading && Object.entries(grouped).map(([day, entries]) => (
        <div key={day} className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide capitalize sticky top-0 bg-background py-1 z-10">
            {day}
          </p>
          <div className="space-y-1">
            {entries.map(a => {
              const Icon = ENTITY_ICONS[a.entity] ?? Activity
              const colorClass = ACTION_COLORS[a.action] ?? 'text-slate-400 border-white/10 bg-white/5'
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 bg-[#111111] border border-white/[0.04] rounded-lg px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', colorClass.split(' ').slice(1).join(' '))}>
                    <Icon className={cn('w-4 h-4', colorClass.split(' ')[0])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px] capitalize', colorClass)}>
                        {a.action}
                      </Badge>
                      <span className="text-[10px] text-slate-500">{a.user_name}</span>
                      <span className="text-[10px] text-slate-600" title={formatFullDate(a.created_at)}>
                        {formatTime(a.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Load more */}
      {!isLoading && activities.length >= limit && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => setLimit(l => l + 50)}
            className="gap-2 text-slate-400"
          >
            <ChevronDown className="w-4 h-4" />
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
