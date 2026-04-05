'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { createAccountSchema } from '@/lib/validations/current-accounts'

type CreateAccountInput = z.infer<typeof createAccountSchema>

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const res = await fetch('/api/current-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al crear cuenta corriente')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['current-accounts'] })
    },
  })
}
