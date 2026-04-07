'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Banknote, ArrowLeftRight, CreditCard, Wallet,
  AlertTriangle, Loader2, ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/hooks/useCheckout'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Step4Props {
  total:               number
  memberCCBalance:     number
  allowCredit:         boolean
  showCCBalance:       boolean
  paymentMethod:       PaymentMethod | null
  amountCash:          number
  amountTransfer:      number
  changeGiven:         number
  isProcessing:        boolean
  error:               string | null
  onSetPaymentMethod:  (m: PaymentMethod) => void
  onSetCash:           (n: number) => void
  onSetTransfer:       (n: number) => void
  onConfirm:           () => void
  onBack:              () => void
}

const METHODS: { key: PaymentMethod; label: string; Icon: React.ElementType; desc: string }[] = [
  { key: 'efectivo',        label: 'Efectivo',           Icon: Banknote,      desc: 'Pago en efectivo' },
  { key: 'transferencia',   label: 'Transferencia',      Icon: ArrowLeftRight, desc: 'Transferencia bancaria' },
  { key: 'mixto',           label: 'Mixto',              Icon: Wallet,        desc: 'Efectivo + transferencia' },
  { key: 'cuenta_corriente',label: 'Cuenta corriente',   Icon: CreditCard,    desc: 'Cargar en fiado' },
]

export function Step4Payment({
  total,
  memberCCBalance,
  allowCredit,
  showCCBalance,
  paymentMethod,
  amountCash,
  amountTransfer,
  changeGiven,
  isProcessing,
  error,
  onSetPaymentMethod,
  onSetCash,
  onSetTransfer,
  onConfirm,
  onBack,
}: Step4Props) {

  const visibleMethods = METHODS.filter(m =>
    m.key !== 'cuenta_corriente' || allowCredit
  )

  const amountPaid    = amountCash + amountTransfer
  const remaining     = total > 0 ? Math.max(0, total - amountPaid) : 0
  const isReadyToPay  = isPaymentReady()

  function isPaymentReady(): boolean {
    if (!paymentMethod) return false
    if (total === 0)    return true
    switch (paymentMethod) {
      case 'efectivo':
        return amountCash >= total
      case 'transferencia':
        return amountTransfer >= total
      case 'mixto':
        return (amountCash + amountTransfer) >= total
      case 'cuenta_corriente':
        return true
      default:
        return false
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Método de pago</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Total a cobrar: <span className="font-bold text-[#2DC814]">{total === 0 ? 'Gratis' : ARS(total)}</span>
        </p>
      </div>

      {/* Saldo CC */}
      {showCCBalance && memberCCBalance !== 0 && (
        <div className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg text-xs border',
          memberCCBalance < 0
            ? 'bg-red-950/20 border-red-900/40 text-red-300'
            : 'bg-[#2DC814]/5 border-[#2DC814]/20 text-slate-400'
        )}>
          <span>Saldo cuenta corriente</span>
          <span className={cn('font-semibold', memberCCBalance < 0 ? 'text-red-400' : 'text-[#2DC814]')}>
            {ARS(memberCCBalance)}
          </span>
        </div>
      )}

      {/* Botones de método */}
      <div className="grid grid-cols-2 gap-2">
        {visibleMethods.map(({ key, label, Icon, desc }) => (
          <button
            key={key}
            onClick={() => onSetPaymentMethod(key)}
            className={cn(
              'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
              paymentMethod === key
                ? 'bg-[#2DC814]/10 border-[#2DC814]/50 text-slate-100'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
            )}
          >
            <Icon className={cn('w-4 h-4', paymentMethod === key ? 'text-[#2DC814]' : '')} />
            <p className={cn('text-sm font-medium', paymentMethod === key ? 'text-slate-100' : 'text-slate-300')}>
              {label}
            </p>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </div>

      {/* Inputs según método */}
      {paymentMethod === 'efectivo' && total > 0 && (
        <div className="space-y-2">
          <Label className="text-slate-300">Monto recibido</Label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              min={0}
              step={100}
              placeholder={`Mín. ${ARS(total)}`}
              value={amountCash || ''}
              onChange={e => onSetCash(parseFloat(e.target.value) || 0)}
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          {changeGiven > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#2DC814]/5 border border-[#2DC814]/20 rounded-lg">
              <span className="text-sm text-slate-400">Vuelto</span>
              <span className="text-base font-bold text-[#2DC814]">{ARS(changeGiven)}</span>
            </div>
          )}
        </div>
      )}

      {paymentMethod === 'transferencia' && total > 0 && (
        <div className="space-y-2">
          <Label className="text-slate-300">Monto transferido</Label>
          <div className="relative">
            <ArrowLeftRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              min={0}
              step={100}
              placeholder={`Mín. ${ARS(total)}`}
              value={amountTransfer || ''}
              onChange={e => onSetTransfer(parseFloat(e.target.value) || 0)}
              className="pl-9 h-11"
              autoFocus
            />
          </div>
        </div>
      )}

      {paymentMethod === 'mixto' && total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Efectivo</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="$0"
              value={amountCash || ''}
              onChange={e => onSetCash(parseFloat(e.target.value) || 0)}
              className="h-10"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Transferencia</Label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="$0"
              value={amountTransfer || ''}
              onChange={e => onSetTransfer(parseFloat(e.target.value) || 0)}
              className="h-10"
            />
          </div>
          {remaining > 0 && (
            <div className="col-span-2 flex items-center justify-between text-xs text-amber-400 px-1">
              <span>Falta cubrir</span>
              <span className="font-semibold">{ARS(remaining)}</span>
            </div>
          )}
          {changeGiven > 0 && (
            <div className="col-span-2 flex items-center justify-between px-3 py-2 bg-[#2DC814]/5 border border-[#2DC814]/20 rounded-lg">
              <span className="text-sm text-slate-400">Vuelto</span>
              <span className="text-base font-bold text-[#2DC814]">{ARS(changeGiven)}</span>
            </div>
          )}
        </div>
      )}

      {paymentMethod === 'cuenta_corriente' && (
        <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80">
            El total <strong className="text-amber-300">{ARS(total)}</strong> se cargará como débito en la cuenta corriente del socio.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          className="h-12 px-4 text-slate-400 border-white/10"
          onClick={onBack}
          disabled={isProcessing}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          className="flex-1 h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold disabled:opacity-50"
          disabled={!isReadyToPay || isProcessing}
          onClick={onConfirm}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>Confirmar y registrar</>
          )}
        </Button>
      </div>
    </div>
  )
}
