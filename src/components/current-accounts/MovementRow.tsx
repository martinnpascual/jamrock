import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import type { CurrentAccountMovement } from '@/types/current-accounts'

const SOURCE_LABELS: Record<string, string> = {
  payment: 'Pago',
  supply_record: 'Compra proveedor',
  sale: 'Venta',
  manual: 'Manual',
  adjustment: 'Ajuste',
  reversal: 'Reversión',
}

interface MovementRowProps {
  movement: CurrentAccountMovement
  canReverse: boolean
  onReverse: (movement: CurrentAccountMovement) => void
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function MovementRow({ movement: m, canReverse, onReverse }: MovementRowProps) {
  const isCredit = m.movement_type === 'credito'
  const isReversed = !!m.reverses_id

  return (
    <div className={cn(
      'grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-2 lg:gap-3 px-4 py-3 items-center hover:bg-white/[0.03] transition-colors group',
      isReversed && 'opacity-60'
    )}>
      {/* Fecha + N° */}
      <div>
        <p className="text-xs font-mono text-slate-500">{m.movement_number}</p>
        <p className="text-xs text-slate-400">
          {new Date(m.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Concepto + descripción */}
      <div>
        <p className="text-sm text-slate-300 font-medium capitalize">{m.concept.replace(/_/g, ' ')}</p>
        {m.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{m.description}</p>}
        {m.source_type && (
          <span className="text-xs text-slate-400 italic">{SOURCE_LABELS[m.source_type] ?? m.source_type}</span>
        )}
        {isReversed && <span className="text-xs text-orange-500 font-medium ml-1">(Revertido)</span>}
      </div>

      {/* Debe */}
      <div className="text-right">
        {!isCredit && (
          <span className="text-sm font-semibold text-red-600">{ARS.format(m.amount)}</span>
        )}
      </div>

      {/* Haber */}
      <div className="text-right">
        {isCredit && (
          <span className="text-sm font-semibold text-green-600">{ARS.format(m.amount)}</span>
        )}
      </div>

      {/* Saldo */}
      <div className="text-right">
        <span className={cn(
          'text-sm font-semibold',
          m.balance_after < 0 ? 'text-red-600' : m.balance_after > 0 ? 'text-green-600' : 'text-slate-500'
        )}>
          {ARS.format(m.balance_after)}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        {canReverse && !isReversed && m.source_type !== 'reversal' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all"
            onClick={() => onReverse(m)}
            title="Revertir movimiento"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
