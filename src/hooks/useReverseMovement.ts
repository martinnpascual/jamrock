'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { reverseMovementSchema } from '@/lib/validations/current-accounts'

type ReverseMovementInput = z.infer<typeof reverseMovementSchema> & { account_id: string }

export function useReverseMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ account_id, ...data }: ReverseMovementInput) => {
      void account_id // used only for cache invalidation in onSuccess
      const res = await fetch('/api/current-accounts/movements/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al revertir movimiento')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['current-accounts'] })
      qc.invalidateQueries({ queryKey: ['current-account', variables.account_id] })
    },
  })
}
