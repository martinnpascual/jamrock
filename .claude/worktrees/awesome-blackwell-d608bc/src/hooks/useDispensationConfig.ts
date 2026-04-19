'use client'

import { useQuery } from '@tanstack/react-query'

export interface DispensationConfig {
  enabled:         boolean
  pricePerGram:    number
  allowCredit:     boolean
  showCCBalance:   boolean
}

async function fetchCheckoutConfig(): Promise<DispensationConfig> {
  const res = await fetch('/api/checkout/config')
  if (!res.ok) throw new Error('Error al cargar configuración de checkout')
  const { config } = await res.json()

  const ppm  = config.dispensation_price_per_gram ?? { enabled: false, price: 0 }
  const acc  = config.checkout_allow_credit       ?? { enabled: true }
  const scc  = config.checkout_show_cc_balance    ?? { enabled: true }

  return {
    enabled:       Boolean(ppm.enabled),
    pricePerGram:  Number(ppm.price ?? 0),
    allowCredit:   Boolean(acc.enabled),
    showCCBalance: Boolean(scc.enabled),
  }
}

export function useDispensationConfig() {
  return useQuery({
    queryKey:  ['checkout-config'],
    queryFn:   fetchCheckoutConfig,
    staleTime: 5 * 60 * 1000,  // 5 min cache
  })
}
