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
  total:                    number
  memberCCBalance:          number
  allowCredit:              boolean
  showCCBalance:            boolean
  paymentMethod:            PaymentMethod | null
  amountCash:               number
  amountTransfer:           number
  amountCC:                 number
  transferDetail:           string
  transferAmountReceived:   number
  changeGiven:              number
  isProcessing:             boolean
  error:                    string | null
  onSetPaymentMethod:       (m: PaymentMethod) => void
  onSetCash:                (n: number) => void
  onSetTransfer:            (n: number) => void
  onSetCC:                  (n: number) => void
  onSetTransferDetail:      (s: string) => void
  onSetTransferAmountReceived: (n: number) => void
  onConfirm:                () => void
  onBack:                   () => void
}

const METHODS: { key: PaymentMethod; label: string; Icon: React.ElementType; desc: string }[] = [
  { key: 'efectivo',        label: 'Efectivo',           Icon: Banknote,      desc: 'Pago en efectivo' },
  { key: 'transferencia',   label: 'Transferencia',      Icon: ArrowLeftRight, desc: 'Transferencia bancaria' },
  { key: 'mixto',           label: 'Mixto',              Icon: Wallet,        desc: 'Efectivo + transf. + CC' },
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
  amountCC,
  transferDetail,
  transferAmountReceived,
  changeGiven,
  isProcessing,
  error,
  onSetPaymentMethod,
  onSetCash,
  onSetTransfer,
  onSetCC,
  onSetTransferDetail,
  onSetTransferAmountReceived,
  onConfirm,
  onBack,
}: Step4Props) {

  const visibleMethods = METHODS.filter(m =>
    m.key !== 'cuenta_corriente' || allowCredit
  )

  // Para mixto (3 vías): la suma total cubierta
  const totalCubierto = paymentMethod === 'mixto'
    ? amountCash + amountTransfer + amountCC
    : amountCash + amountTransfer
  const remaining = total > 0 ? Math.max(0, total - totalCubierto) : 0
  const isReadyToPay = isPaymentReady()

  function isPaymentReady(): boolean {
    if (!paymentMethod) return false
    if (total === 0)    return true
    switch (paymentMethod) {
      case 'efectivo':
        return amountCash >= total
      case 'transferencia':
        return amountTransfer >= total
      case 'mixto':
        return (amountCash + amountTransfer + amountCC) >= total
      case 'cuenta_corriente':
        return true
      default:
        return false
    }
  }

  // Determinar el método real que se enviará a la API
  function getActualMethod(): PaymentMethod {
    if (paymentMethod !== 'mixto') return paymentMethod!
    // Si se usaron los 3, es mixto_3. Si solo 2 (cash+transfer), es mixto clásico
    const nonZero = [amountCash, amountTransfer, amountCC].filter(v => v > 0).length
    if (nonZero >= 2 && amountCC > 0) return 'mixto_3'
    if (amountCC > 0 && nonZero === 1) return 'cuenta_corriente'
    if (amountCash > 0 && amountTransfer === 0 && amountCC === 0) return 'efectivo'
    if (amountTransfer > 0 && amountCash === 0 && amountCC === 0) return 'transferencia'
    return 'mixto'
  }

  function handleConfirm() {
    // Remap payment method based on actual amounts
    const actualMethod = getActualMethod()
    if (actualMethod !== paymentMethod) {
      onSetPaymentMethod(actualMethod)
      // Give state a tick to update, then confirm
      setTimeout(() => onConfirm(), 0)
    } else {
      onConfirm()
    }
  }

  // Build confirm button label
  function getConfirmLabel(): string {
    if (paymentMethod === 'mixto' && total > 0) {
      const parts: string[] = []
      if (amountCash > 0) parts.push(`${ARS(amountCash)} efectivo`)
      if (amountTransfer > 0) parts.push(`${ARS(amountTransfer)} transf.`)
      if (amountCC > 0) parts.push(`${ARS(amountCC)} CC`)
      if (parts.length > 0) return `Confirmar — ${parts.join(' + ')}`
    }
    return 'Confirmar y registrar'
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
              'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all min-h-[44px]',
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

      {/* ── Inputs: EFECTIVO ── */}
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

      {/* ── Inputs: TRANSFERENCIA ── */}
      {paymentMethod === 'transferencia' && total > 0 && (
        <div className="space-y-3">
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
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Detalle de operación <span className="text-slate-500">(opcional)</span></Label>
            <Input
              type="text"
              placeholder="N° comprobante, alias, CBU..."
              value={transferDetail}
              onChange={e => onSetTransferDetail(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      )}

      {/* ── Inputs: MIXTO (3 vías) ── */}
      {paymentMethod === 'mixto' && total > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
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
            {allowCredit && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Cuenta corriente</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="$0"
                  value={amountCC || ''}
                  onChange={e => onSetCC(parseFloat(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
            )}
          </div>

          {/* Total cubierto */}
          <div className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg text-xs border',
            totalCubierto >= total
              ? 'bg-[#2DC814]/5 border-[#2DC814]/20'
              : 'bg-amber-950/20 border-amber-800/30'
          )}>
            <span className="text-slate-400">
              Total cubierto: <span className="font-semibold text-slate-200">{ARS(totalCubierto)}</span> de {ARS(total)}
            </span>
            {remaining > 0 && (
              <span className="font-semibold text-amber-400">Falta: {ARS(remaining)}</span>
            )}
            {totalCubierto >= total && (
              <span className="font-semibold text-[#2DC814]">Cubierto</span>
            )}
          </div>

          {/* Detalle de transferencia (si hay monto) */}
          {amountTransfer > 0 && (
            <div className="space-y-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Monto depositado <span className="text-slate-500">(lo que realmente transfirió)</span></Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder={ARS(amountTransfer)}
                  value={transferAmountReceived || ''}
                  onChange={e => onSetTransferAmountReceived(parseFloat(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Detalle de operación <span className="text-slate-500">(opcional)</span></Label>
                <Input
                  type="text"
                  placeholder="N° comprobante, alias, CBU..."
                  value={transferDetail}
                  onChange={e => onSetTransferDetail(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* Advertencia CC */}
          {amountCC > 0 && (
            <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300/80">
                <p>Se cargarán <strong className="text-amber-300">{ARS(amountCC)}</strong> a la cuenta corriente del socio.</p>
                {showCCBalance && (
                  <p className="mt-1 text-slate-500">
                    Saldo actual: {ARS(memberCCBalance)} → Nuevo saldo: <span className={cn(
                      'font-semibold',
                      (memberCCBalance - amountCC) < 0 ? 'text-red-400' : 'text-[#2DC814]'
                    )}>{ARS(memberCCBalance - amountCC)}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {changeGiven > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#2DC814]/5 border border-[#2DC814]/20 rounded-lg">
              <span className="text-sm text-slate-400">Vuelto</span>
              <span className="text-base font-bold text-[#2DC814]">{ARS(changeGiven)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Inputs: CUENTA CORRIENTE ── */}
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
          className="h-12 px-4 text-slate-400 border-white/10 min-h-[44px]"
          onClick={onBack}
          disabled={isProcessing}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          className="flex-1 h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold disabled:opacity-50 min-h-[44px]"
          disabled={!isReadyToPay || isProcessing}
          onClick={handleConfirm}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>{getConfirmLabel()}</>
          )}
        </Button>
      </div>
    </div>
  )
}
