'use client'

import { useQuery } from '@tanstack/react-query'
import type { CurrentAccount, AccountFilters } from '@/types/current-accounts'

export function useCurrentAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: ['current-accounts', filters],
    queryFn: async (): Promise<CurrentAccount[]> => {
      const params = new URLSearchParams()
      if (filters?.entity_type) params.set('entity_type', filters.entity_type)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.balance_status) params.set('balance_status', filters.balance_status)

      const res = await fetch(`/api/current-accounts?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al obtener cuentas corrientes')
      }
      const json = await res.json()
      return json.data ?? []
    },
  })
}
