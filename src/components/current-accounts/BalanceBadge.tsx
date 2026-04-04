import { cn } from '@/lib/utils'

interface BalanceBadgeProps {
  balance: number
  className?: string
}

export function BalanceBadge({ balance, className }: BalanceBadgeProps) {
  const isPositive = balance > 0
  const isNegative = balance < 0

  const style = isPositive
    ? 'bg-green-50 text-green-800 border-green-200'
    : isNegative
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-slate-50 text-slate-600 border-slate-200'

  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.abs(balance))

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        style,
        className
      )}
    >
      {isNegative && '−'}
      {isPositive && '+'}
      {formatted}
    </span>
  )
}
