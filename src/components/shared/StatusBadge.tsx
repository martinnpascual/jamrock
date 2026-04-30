import { cn } from '@/lib/utils'
import { REPROCANN_STATUS_LABELS } from '@/lib/constants'
import type { ReprocannStatus } from '@/types/database'

const STATUS_STYLES: Record<ReprocannStatus, string> = {
  vigente: 'bg-green-50 text-green-800 border-green-200',
  en_tramite: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  iniciar: 'bg-orange-50 text-orange-800 border-orange-200',
  no_tramita: 'bg-slate-50 text-slate-600 border-slate-200',
  baja: 'bg-red-50 text-red-800 border-red-200',
  no_aplica: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_DOT: Record<ReprocannStatus, string> = {
  vigente: 'bg-green-500',
  en_tramite: 'bg-yellow-500',
  iniciar: 'bg-orange-400',
  no_tramita: 'bg-slate-400',
  baja: 'bg-red-500',
  no_aplica: 'bg-gray-400',
}

interface StatusBadgeProps {
  status: ReprocannStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-600 border-gray-200',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-gray-400')} />
      {REPROCANN_STATUS_LABELS[status] ?? status}
    </span>
  )
}
