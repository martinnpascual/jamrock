import { cn } from '@/lib/utils'

interface BalanceBadgeProps {
  balance: number
  className?: string
}

export function BalanceBadge({ balance, className }: BalanceBadgeProps) {
  const isPositive = balance > 0
  const isNegative = balance < 0

  const style = isPositive
    ? 'bg-[#2DC814]/10 text-[#2DC814] border-[#2DC814]/25'
    : isNegative
      ? 'bg-red-950/50 text-red-400 border-red-900/50'
      : 'bg-white/5 text-slate-500 border-white/10'

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
