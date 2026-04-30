import { cn } from '@/lib/utils'
import { CONDICION_LABELS } from '@/lib/constants'
import type { Condicion } from '@/types/database'

const CONDICION_STYLES: Record<Condicion, string> = {
  delegacion_sistema_vigente:    'bg-green-50 text-green-800 border-green-200',
  delegacion_contrato_vigente:   'bg-green-50 text-green-800 border-green-200',
  delegacion_sistema_en_tramite: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  delegacion_sistema_pendiente:  'bg-yellow-50 text-yellow-800 border-yellow-200',
  reiniciar:                     'bg-yellow-50 text-yellow-800 border-yellow-200',
  no_delega:                     'bg-blue-50 text-blue-800 border-blue-200',
  no_tramita_reprocann:          'bg-gray-50 text-gray-700 border-gray-200',
  asociado_baja:                 'bg-red-50 text-red-800 border-red-200',
  no_aplica:                     'bg-gray-50 text-gray-500 border-gray-200',
}

interface CondicionBadgeProps {
  condicion: Condicion | string
  className?: string
}

export function CondicionBadge({ condicion, className }: CondicionBadgeProps) {
  const style = CONDICION_STYLES[condicion as Condicion] ?? 'bg-gray-50 text-gray-600 border-gray-200'
  const label = CONDICION_LABELS[condicion] ?? condicion

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
