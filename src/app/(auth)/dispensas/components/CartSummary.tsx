'use client'

import { Minus, Plus, X, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem, DispensationInput } from '@/hooks/useCheckout'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface CartSummaryProps {
  dispensations:        DispensationInput[]
  cartItems:            CartItem[]
  dispensationSubtotal: number
  productsSubtotal:     number
  total:                number
  readonly?:            boolean
  paymentMethod?:       string | null
  amountPaid?:          number
  changeGiven?:         number
  onRemoveItem?:        (productId: string) => void
  onUpdateQty?:         (productId: string, qty: number) => void
}

export function CartSummary({
  dispensations,
  cartItems,
  dispensationSubtotal,
  productsSubtotal,
  total,
  readonly = false,
  paymentMethod,
  amountPaid,
  changeGiven,
  onRemoveItem,
  onUpdateQty,
}: CartSummaryProps) {
  const hasItems = cartItems.length > 0
  const hasDispensations = dispensations.length > 0
  const hasAnything = hasDispensations || hasItems

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 space-y-3 h-fit">
      <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
        <ShoppingCart className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-300">Resumen del pedido</h3>
      </div>

      {!hasAnything && (
        <p className="text-xs text-slate-500 text-center py-4">
          Completá los datos de la dispensa para ver el resumen.
        </p>
      )}

      {/* Dispensas */}
      {hasDispensations && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dispensa medicinal</p>
          {dispensations.map((d, idx) => {
            const discAmt = d.discountFixedAmount ?? d.cost * ((d.discountPercent ?? 0) / 100)
            const itemTotal = d.cost - discAmt
            const discLabel = d.discountFixedAmount != null
              ? `−${ARS(d.discountFixedAmount)} desc.`
              : d.discountPercent > 0
                ? `${d.discountPercent}% desc.`
                : ''
            return (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{d.genetics}</p>
                  <p className="text-xs text-slate-500">
                    {d.quantity_grams}g
                    {discLabel && ` · ${discLabel}`}
                  </p>
                </div>
                <p className={cn('text-sm font-semibold flex-shrink-0',
                  itemTotal === 0 ? 'text-[#2DC814]' : 'text-slate-100'
                )}>
                  {itemTotal === 0 ? 'Gratis' : ARS(itemTotal)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Productos */}
      {hasItems && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Productos</p>
          <div className="space-y-2">
            {cartItems.map(item => (
              <div key={item.product_id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{item.product_name}</p>
                  <p className="text-xs text-slate-500">{ARS(item.unit_price)} c/u</p>
                </div>

                {!readonly && onUpdateQty && onRemoveItem ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onUpdateQty(item.product_id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium text-slate-200 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.product_id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.product_id)}
                      className="w-6 h-6 rounded hover:bg-red-950/30 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">×{item.quantity}</span>
                    <p className="text-sm font-semibold text-slate-100">{ARS(item.subtotal)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtotales + Total */}
      {hasAnything && (
        <div className="border-t border-white/[0.05] pt-3 space-y-1.5">
          {dispensationSubtotal > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Dispensa</span>
              <span>{ARS(dispensationSubtotal)}</span>
            </div>
          )}
          {productsSubtotal > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Productos</span>
              <span>{ARS(productsSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-bold text-slate-200">TOTAL</span>
            <span className="text-lg font-bold text-[#2DC814]">
              {total === 0 ? 'Gratis' : ARS(total)}
            </span>
          </div>
        </div>
      )}

      {/* Pago info (en modo readonly, step 4+) */}
      {readonly && paymentMethod && (
        <div className="border-t border-white/[0.05] pt-3 space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Método de pago</p>
          <p className="text-sm text-slate-200 capitalize">
            {paymentMethod === 'cuenta_corriente' ? 'Cuenta corriente (fiado)' : paymentMethod}
          </p>
          {amountPaid !== undefined && amountPaid > 0 && (
            <p className="text-xs text-slate-400">Recibido: {ARS(amountPaid)}</p>
          )}
          {changeGiven !== undefined && changeGiven > 0 && (
            <p className="text-xs text-[#2DC814] font-medium">Vuelto: {ARS(changeGiven)}</p>
          )}
        </div>
      )}
    </div>
  )
}
