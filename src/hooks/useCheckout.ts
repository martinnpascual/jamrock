'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Member } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  product_id:   string
  product_name: string
  unit_price:   number
  quantity:     number
  subtotal:     number
}

export interface DispensationInput {
  lot_id:         string
  genetics:       string
  quantity_grams: number
  notes:          string
  cost:           number  // gramos × price_per_gram (0 si gratis)
}

export interface CheckoutResult {
  transaction_number:   string
  dispensation_number:  string
  total_amount:         number
  dispensation_amount:  number
  products_amount:      number
  payment_status:       'pagado' | 'fiado'
  amount_paid:          number
  amount_charged_to_cc: number
  change_given:         number
  cc_balance:           number
}

export type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto' | 'cuenta_corriente'

export interface CheckoutState {
  currentStep:         1 | 2 | 3 | 4 | 5
  member:              Member | null
  memberCCBalance:     number
  dispensation:        DispensationInput | null
  cartItems:           CartItem[]
  paymentMethod:       PaymentMethod | null
  amountCash:          number
  amountTransfer:      number
  result:              CheckoutResult | null
  isProcessing:        boolean
  error:               string | null
}

// ── Initial State ─────────────────────────────────────────────────────────────

const initialState: CheckoutState = {
  currentStep:     1,
  member:          null,
  memberCCBalance: 0,
  dispensation:    null,
  cartItems:       [],
  paymentMethod:   null,
  amountCash:      0,
  amountTransfer:  0,
  result:          null,
  isProcessing:    false,
  error:           null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCheckout() {
  const [state, setState] = useState<CheckoutState>(initialState)

  // ── Totales calculados ────────────────────────────────────────────────────
  const dispensationSubtotal = state.dispensation?.cost ?? 0
  const productsSubtotal = useMemo(
    () => state.cartItems.reduce((sum, i) => sum + i.subtotal, 0),
    [state.cartItems]
  )
  const total = dispensationSubtotal + productsSubtotal

  const changeGiven = useMemo(() => {
    if (state.paymentMethod !== 'efectivo' && state.paymentMethod !== 'mixto') return 0
    const paid = state.amountCash + state.amountTransfer
    return Math.max(0, paid - total)
  }, [state.paymentMethod, state.amountCash, state.amountTransfer, total])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setMember = useCallback((member: Member | null, ccBalance = 0) => {
    setState(s => ({ ...s, member, memberCCBalance: ccBalance, currentStep: member ? 2 : 1 }))
  }, [])

  const setDispensation = useCallback((dispensation: DispensationInput | null) => {
    setState(s => ({ ...s, dispensation }))
  }, [])

  const goToStep = useCallback((step: CheckoutState['currentStep']) => {
    setState(s => ({ ...s, currentStep: step }))
  }, [])

  const addToCart = useCallback((item: Omit<CartItem, 'quantity' | 'subtotal'>) => {
    setState(s => {
      const existing = s.cartItems.find(i => i.product_id === item.product_id)
      if (existing) {
        return {
          ...s,
          cartItems: s.cartItems.map(i =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + 1, subtotal: i.unit_price * (i.quantity + 1) }
              : i
          ),
        }
      }
      return {
        ...s,
        cartItems: [...s.cartItems, { ...item, quantity: 1, subtotal: item.unit_price }],
      }
    })
  }, [])

  const removeFromCart = useCallback((product_id: string) => {
    setState(s => ({ ...s, cartItems: s.cartItems.filter(i => i.product_id !== product_id) }))
  }, [])

  const updateCartQuantity = useCallback((product_id: string, quantity: number) => {
    if (quantity <= 0) {
      setState(s => ({ ...s, cartItems: s.cartItems.filter(i => i.product_id !== product_id) }))
    } else {
      setState(s => ({
        ...s,
        cartItems: s.cartItems.map(i =>
          i.product_id === product_id
            ? { ...i, quantity, subtotal: i.unit_price * quantity }
            : i
        ),
      }))
    }
  }, [])

  const setPaymentMethod = useCallback((method: PaymentMethod | null) => {
    setState(s => ({ ...s, paymentMethod: method, amountCash: 0, amountTransfer: 0 }))
  }, [])

  const setCashAmount = useCallback((amount: number) => {
    setState(s => ({ ...s, amountCash: amount }))
  }, [])

  const setTransferAmount = useCallback((amount: number) => {
    setState(s => ({ ...s, amountTransfer: amount }))
  }, [])

  // ── processCheckout ───────────────────────────────────────────────────────

  const processCheckout = useCallback(async () => {
    if (!state.member || !state.dispensation || !state.paymentMethod) {
      setState(s => ({ ...s, error: 'Datos incompletos para procesar el checkout' }))
      return
    }

    setState(s => ({ ...s, isProcessing: true, error: null }))

    const body = {
      member_id: state.member.id,
      dispensation: {
        lot_id:         state.dispensation.lot_id,
        genetics:       state.dispensation.genetics,
        quantity_grams: state.dispensation.quantity_grams,
        notes:          state.dispensation.notes || undefined,
      },
      items: state.cartItems.map(i => ({
        product_id: i.product_id,
        quantity:   i.quantity,
      })),
      payment: buildPaymentPayload(state),
    }

    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setState(s => ({ ...s, isProcessing: false, error: data.error ?? 'Error al procesar checkout' }))
        return
      }

      setState(s => ({
        ...s,
        isProcessing: false,
        result:       data.transaction as CheckoutResult,
        currentStep:  5,
      }))
    } catch {
      setState(s => ({ ...s, isProcessing: false, error: 'Error de red. Intentá nuevamente.' }))
    }
  }, [state])

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    dispensationSubtotal,
    productsSubtotal,
    total,
    changeGiven,
    setMember,
    setDispensation,
    goToStep,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setPaymentMethod,
    setCashAmount,
    setTransferAmount,
    processCheckout,
    reset,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPaymentPayload(state: CheckoutState) {
  const { paymentMethod, amountCash, amountTransfer } = state
  switch (paymentMethod) {
    case 'efectivo':
      return { method: 'efectivo', amount_cash: amountCash, amount_transfer: 0 }
    case 'transferencia':
      return { method: 'transferencia', amount_cash: 0, amount_transfer: amountTransfer }
    case 'mixto':
      return { method: 'mixto', amount_cash: amountCash, amount_transfer: amountTransfer }
    case 'cuenta_corriente':
      return { method: 'cuenta_corriente' }
    default:
      return { method: 'cuenta_corriente' }
  }
}
