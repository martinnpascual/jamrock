'use client'

import { useCheckout }           from '@/hooks/useCheckout'
import { useDispensationConfig } from '@/hooks/useDispensationConfig'
import { CartSummary }           from './CartSummary'
import { Step1MemberSelect }     from './Step1MemberSelect'
import { Step2Dispensation }     from './Step2Dispensation'
import { Step3Products }         from './Step3Products'
import { Step4Payment }          from './Step4Payment'
import { Step5Confirmation }     from './Step5Confirmation'
import { cn } from '@/lib/utils'
import { User, Leaf, ShoppingBag, CreditCard, CheckCircle2 } from 'lucide-react'

// ── Barra de progreso ─────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Socio',     Icon: User         },
  { num: 2, label: 'Dispensa',  Icon: Leaf         },
  { num: 3, label: 'Productos', Icon: ShoppingBag  },
  { num: 4, label: 'Pago',      Icon: CreditCard   },
  { num: 5, label: 'Listo',     Icon: CheckCircle2 },
]

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map(({ num, label, Icon }, idx) => {
        const done   = num < current
        const active = num === current

        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            {/* Nodo */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all',
                done   ? 'bg-[#2DC814] border-[#2DC814] text-black'   :
                active ? 'bg-[#2DC814]/10 border-[#2DC814] text-[#2DC814]' :
                         'bg-white/[0.02] border-white/10 text-slate-500'
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={cn(
                'text-[10px] hidden sm:block',
                done   ? 'text-[#2DC814]' :
                active ? 'text-slate-200'  :
                         'text-slate-600'
              )}>
                {label}
              </span>
            </div>

            {/* Línea conectora */}
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-1 transition-all',
                done ? 'bg-[#2DC814]/50' : 'bg-white/[0.06]'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── CheckoutWizard ────────────────────────────────────────────────────────────

export function CheckoutWizard() {
  const checkout = useCheckout()
  const { data: config } = useDispensationConfig()

  const {
    currentStep, member, memberCCBalance, dispensations,
    cartItems, paymentMethod, amountCash, amountTransfer, amountCC,
    transferDetail, transferAmountReceived,
    changeGiven, dispensationSubtotal, productsSubtotal, total,
    isProcessing, error, result,
  } = checkout

  // Mostrar carrito lateral solo en steps 2-4 y cuando haya algo para mostrar
  const showCart = currentStep >= 2 && currentStep <= 4

  return (
    <div className={cn(
      'mx-auto',
      showCart ? 'max-w-4xl' : 'max-w-lg'
    )}>
      <ProgressBar current={currentStep} />

      <div className={cn(
        'gap-6',
        showCart ? 'grid grid-cols-1 md:grid-cols-[1fr_300px]' : ''
      )}>
        {/* Panel principal */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          {currentStep === 1 && (
            <Step1MemberSelect
              onMemberSelected={(m, balance) => checkout.setMember(m, balance)}
            />
          )}

          {currentStep === 2 && (
            <Step2Dispensation
              config={config}
              initialDispensations={dispensations.length > 0 ? dispensations : undefined}
              onOnlyDispense={inputs => {
                checkout.setDispensation(null) // clear first
                inputs.forEach(d => checkout.addDispensation(d))
                checkout.goToStep(4)
              }}
              onAddProducts={inputs => {
                checkout.setDispensation(null) // clear first
                inputs.forEach(d => checkout.addDispensation(d))
                checkout.goToStep(3)
              }}
            />
          )}

          {currentStep === 3 && (
            <Step3Products
              cartItems={cartItems}
              onAddToCart={checkout.addToCart}
              onContinue={() => checkout.goToStep(4)}
            />
          )}

          {currentStep === 4 && (
            <Step4Payment
              total={total}
              memberCCBalance={memberCCBalance}
              allowCredit={config?.allowCredit ?? true}
              showCCBalance={config?.showCCBalance ?? true}
              paymentMethod={paymentMethod}
              ccMode={checkout.ccMode}
              amountCash={amountCash}
              amountTransfer={amountTransfer}
              amountCC={amountCC}
              transferDetail={transferDetail}
              transferAmountReceived={transferAmountReceived}
              changeGiven={changeGiven}
              isProcessing={isProcessing}
              error={error}
              onSetPaymentMethod={checkout.setPaymentMethod}
              onSetCCMode={checkout.setCCMode}
              onSetCash={checkout.setCashAmount}
              onSetTransfer={checkout.setTransferAmount}
              onSetCC={checkout.setCCAmount}
              onSetTransferDetail={checkout.setTransferDetail}
              onSetTransferAmountReceived={checkout.setTransferAmountReceived}
              onConfirm={checkout.processCheckout}
              onBack={() => checkout.goToStep(cartItems.length > 0 ? 3 : 2)}
            />
          )}

          {currentStep === 5 && result && member && (
            <Step5Confirmation
              result={result}
              member={member}
              onReset={checkout.reset}
            />
          )}
        </div>

        {/* Carrito lateral (steps 2-4) */}
        {showCart && (
          <div className="md:sticky md:top-6 h-fit">
            <CartSummary
              dispensations={dispensations}
              cartItems={cartItems}
              dispensationSubtotal={dispensationSubtotal}
              productsSubtotal={productsSubtotal}
              total={total}
              onRemoveItem={currentStep === 3 ? checkout.removeFromCart : undefined}
              onUpdateQty={currentStep === 3 ? checkout.updateCartQuantity : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
