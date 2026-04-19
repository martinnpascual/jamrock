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
  lot_id:           string
  genetics:         string
  quantity_grams:   number
  notes:            string
  cost:             number  // subtotal: gramos × price_per_gram (antes de descuento)
  discountPercent:  number  // 0 | 5 | 10 | 15 | 20 | 25
}

export type CCMode = 'fiado' | 'saldo'

export interface CheckoutResult {
  transaction_number:   string
  dispensation_number:  string
  total_amount:         number
  dispensation_amount:  number
  products_amount:      number
  payment_status:       'pagado' | 'fiado' | 'parcial'
  payment_method:       string | null
  amount_paid:          number
  amount_cash:          number
  amount_transfer:      number
  amount_charged_to_cc: number
  change_given:         number
  transfer_detail:      string | null
  cc_balance:           number
}

export type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto' | 'mixto_3' | 'cuenta_corriente'

export interface CheckoutState {
  currentStep:            1 | 2 | 3 | 4 | 5
  member:                 Member | null
  memberCCBalance:        number
  dispensations:          DispensationInput[]
  cartItems:              CartItem[]
  paymentMethod:          PaymentMethod | null
  ccMode:                 CCMode | null
  amountCash:             number
  amountTransfer:         number
  amountCC:               number
  transferDetail:         string
  transferAmountReceived: number
  result:                 CheckoutResult | null
  isProcessing:           boolean
  error:                  string | null
}

// ── Initial State ─────────────────────────────────────────────────────────────

const initialState: CheckoutState = {
  currentStep:            1,
  member:                 null,
  memberCCBalance:        0,
  dispensations:          [],
  cartItems:              [],
  paymentMethod:          null,
  ccMode:                 null,
  amountCash:             0,
  amountTransfer:         0,
  amountCC:               0,
  transferDetail:         '',
  transferAmountReceived: 0,
  result:                 null,
  isProcessing:           false,
  error:                  null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCheckout() {
  const [state, setState] = useState<CheckoutState>(initialState)

  // ── Totales calculados ────────────────────────────────────────────────────
  const dispensationSubtotal = useMemo(() => {
    return state.dispensations.reduce((sum, d) => {
      const discountAmount = d.cost * ((d.discountPercent ?? 0) / 100)
      return sum + (d.cost - discountAmount)
    }, 0)
  }, [state.dispensations])

  const productsSubtotal = useMemo(
    () => state.cartItems.reduce((sum, i) => sum + i.subtotal, 0),
    [state.cartItems]
  )
  const total = dispensationSubtotal + productsSubtotal

  const changeGiven = useMemo(() => {
    if (state.paymentMethod === 'efectivo') {
      return Math.max(0, state.amountCash - total)
    }
    if (state.paymentMethod === 'mixto') {
      return Math.max(0, state.amountCash + state.amountTransfer - total)
    }
    if (state.paymentMethod === 'mixto_3') {
      const partePagada = total - state.amountCC
      return Math.max(0, state.amountCash + state.amountTransfer - partePagada)
    }
    return 0
  }, [state.paymentMethod, state.amountCash, state.amountTransfer, state.amountCC, total])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setMember = useCallback((member: Member | null, ccBalance = 0) => {
    setState(s => ({ ...s, member, memberCCBalance: ccBalance, currentStep: member ? 2 : 1 }))
  }, [])

  const setDispensation = useCallback((dispensation: DispensationInput | null) => {
    setState(s => ({
      ...s,
      dispensations: dispensation ? [dispensation] : [],
    }))
  }, [])

  const addDispensation = useCallback((dispensation: DispensationInput) => {
    setState(s => ({
      ...s,
      dispensations: [...s.dispensations, dispensation],
    }))
  }, [])

  const removeDispensation = useCallback((index: number) => {
    setState(s => ({
      ...s,
      dispensations: s.dispensations.filter((_, i) => i !== index),
    }))
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
    setState(s => ({
      ...s,
      paymentMethod: method,
      ccMode: null,
      amountCash: 0,
      amountTransfer: 0,
      amountCC: 0,
      transferDetail: '',
      transferAmountReceived: 0,
    }))
  }, [])

  const setCCMode = useCallback((mode: CCMode | null) => {
    setState(s => ({ ...s, ccMode: mode }))
  }, [])

  const setCashAmount = useCallback((amount: number) => {
    setState(s => ({ ...s, amountCash: amount }))
  }, [])

  const setTransferAmount = useCallback((amount: number) => {
    setState(s => ({ ...s, amountTransfer: amount }))
  }, [])

  const setCCAmount = useCallback((amount: number) => {
    setState(s => ({ ...s, amountCC: amount }))
  }, [])

  const setTransferDetail = useCallback((detail: string) => {
    setState(s => ({ ...s, transferDetail: detail }))
  }, [])

  const setTransferAmountReceived = useCallback((amount: number) => {
    setState(s => ({ ...s, transferAmountReceived: amount }))
  }, [])

  // ── processCheckout ───────────────────────────────────────────────────────

  const processCheckout = useCallback(async () => {
    if (!state.member || state.dispensations.length === 0 || !state.paymentMethod) {
      setState(s => ({ ...s, error: 'Datos incompletos para procesar el checkout' }))
      return
    }

    // Validar ccMode si es cuenta_corriente
    if (state.paymentMethod === 'cuenta_corriente' && !state.ccMode) {
      setState(s => ({ ...s, error: 'Seleccioná si es fiado o saldo' }))
      return
    }

    setState(s => ({ ...s, isProcessing: true, error: null }))

    const body = {
      member_id: state.member.id,
      dispensations: state.dispensations.map(d => ({
        lot_id:           d.lot_id,
        genetics:         d.genetics,
        quantity_grams:   d.quantity_grams,
        notes:            d.notes || undefined,
        discount_percent: d.discountPercent ?? 0,
      })),
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
    // Backward compat: expose first dispensation as `dispensation`
    dispensation: state.dispensations[0] ?? null,
    dispensationSubtotal,
    productsSubtotal,
    total,
    changeGiven,
    setMember,
    setDispensation,
    addDispensation,
    removeDispensation,
    goToStep,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setPaymentMethod,
    setCCMode,
    setCashAmount,
    setTransferAmount,
    setCCAmount,
    setTransferDetail,
    setTransferAmountReceived,
    processCheckout,
    reset,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPaymentPayload(state: CheckoutState) {
  const { paymentMethod, ccMode, amountCash, amountTransfer, amountCC, transferDetail, transferAmountReceived } = state

  const transferFields = (amountTransfer > 0 || transferDetail)
    ? {
      ...(transferDetail ? { transfer_detail: transferDetail } : {}),
      ...(transferAmountReceived > 0 ? { transfer_amount_received: transferAmountReceived } : {}),
    }
    : {}

  switch (paymentMethod) {
    case 'efectivo':
      return { method: 'efectivo', amount_cash: amountCash, amount_transfer: 0 }
    case 'transferencia':
      return { method: 'transferencia', amount_cash: 0, amount_transfer: amountTransfer, ...transferFields }
    case 'mixto':
      return { method: 'mixto', amount_cash: amountCash, amount_transfer: amountTransfer, ...transferFields }
    case 'mixto_3':
      return { method: 'mixto_3', amount_cash: amountCash, amount_transfer: amountTransfer, amount_cc: amountCC, ...transferFields }
    case 'cuenta_corriente':
      return { method: 'cuenta_corriente', cc_mode: ccMode ?? 'fiado' }
    default:
      return { method: 'cuenta_corriente', cc_mode: ccMode ?? 'fiado' }
  }
}
