import { cn } from '@/lib/utils'

interface BalanceBadgeProps {
  balance: number
  className?: string
}

export function BalanceBadge({ balance, className }: BalanceBadgeProps) {
  const isPositive = balance > 0
  const isNegative = balance < 0

  const style = isPositive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100'
    : isNegative
      ? 'bg-red-50 text-red-700 border-red-200 ring-red-100'
      : 'bg-slate-100 text-slate-500 border-slate-200'

  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.abs(balance))

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-bold border tabular-nums',
        style,
        className
      )}
    >
      {isNegative && <span className="opacity-70">−</span>}
      {isPositive && <span className="opacity-70">+</span>}
      {formatted}
    </span>
  )
}
