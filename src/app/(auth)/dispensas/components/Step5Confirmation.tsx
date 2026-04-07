'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Leaf, ShoppingBag, CreditCard, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CheckoutResult } from '@/hooks/useCheckout'
import type { Member } from '@/types/database'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Step5Props {
  result:  CheckoutResult
  member:  Member
  onReset: () => void
}

export function Step5Confirmation({ result, member, onReset }: Step5Props) {
  const isPagado = result.payment_status === 'pagado'

  return (
    <div className="space-y-6 py-2">
      {/* Ícono de éxito */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#2DC814]/10 border border-[#2DC814]/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#2DC814]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">¡Dispensa registrada!</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {member.first_name} {member.last_name}
          </p>
        </div>
      </div>

      {/* Números de referencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">N° Transacción</p>
          <p className="text-base font-bold text-slate-100 font-mono">{result.transaction_number}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">N° Dispensa</p>
          <p className="text-base font-bold text-[#2DC814] font-mono">{result.dispensation_number}</p>
        </div>
      </div>

      {/* Detalle de montos */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
        {result.dispensation_amount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Leaf className="w-4 h-4 text-[#2DC814]" />
              Dispensa
            </div>
            <p className="text-sm font-semibold text-slate-100">{ARS(result.dispensation_amount)}</p>
          </div>
        )}

        {result.products_amount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              Productos
            </div>
            <p className="text-sm font-semibold text-slate-100">{ARS(result.products_amount)}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <p className="text-sm font-bold text-slate-200">TOTAL</p>
          <p className="text-lg font-bold text-[#2DC814]">
            {result.total_amount === 0 ? 'Gratis' : ARS(result.total_amount)}
          </p>
        </div>

        {/* Estado de pago */}
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CreditCard className="w-4 h-4" />
            Estado
          </div>
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            isPagado
              ? 'bg-[#2DC814]/10 text-[#2DC814] border border-[#2DC814]/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          )}>
            {isPagado ? 'Pagado' : 'Fiado'}
          </span>
        </div>

        {result.amount_paid > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 gap-2">
            <p className="text-xs text-slate-500">Recibido</p>
            <p className="text-xs text-slate-400">{ARS(result.amount_paid)}</p>
          </div>
        )}

        {result.change_given > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 gap-2">
            <p className="text-xs text-slate-500">Vuelto entregado</p>
            <p className="text-xs font-semibold text-[#2DC814]">{ARS(result.change_given)}</p>
          </div>
        )}

        {result.amount_charged_to_cc > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 gap-2">
            <p className="text-xs text-slate-500">Cargado a CC</p>
            <p className="text-xs font-semibold text-amber-400">{ARS(result.amount_charged_to_cc)}</p>
          </div>
        )}

        {result.cc_balance !== undefined && (
          <div className="flex items-center justify-between px-4 py-2.5 gap-2">
            <p className="text-xs text-slate-500">Saldo CC actual</p>
            <p className={cn(
              'text-xs font-semibold',
              result.cc_balance >= 0 ? 'text-[#2DC814]' : 'text-red-400'
            )}>
              {ARS(result.cc_balance)}
            </p>
          </div>
        )}
      </div>

      {/* Botón nueva dispensa */}
      <Button
        onClick={onReset}
        className="w-full h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold"
      >
        <Plus className="w-4 h-4" />
        Nueva dispensa
      </Button>
    </div>
  )
}
