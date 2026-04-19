'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { createMovementSchema } from '@/lib/validations/current-accounts'

type CreateMovementInput = z.infer<typeof createMovementSchema>

export function useCreateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateMovementInput) => {
      const res = await fetch('/api/current-accounts/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al registrar movimiento')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['current-accounts'] })
      qc.invalidateQueries({ queryKey: ['current-account', variables.account_id] })
    },
  })
}
