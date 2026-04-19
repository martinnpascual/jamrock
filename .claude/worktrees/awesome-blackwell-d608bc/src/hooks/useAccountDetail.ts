'use client'

import { useQuery } from '@tanstack/react-query'
import type { AccountStatement } from '@/types/current-accounts'

interface AccountDetailFilters {
  page?: number
  limit?: number
  from?: string | null
  to?: string | null
}

export function useAccountDetail(id: string, filters?: AccountDetailFilters) {
  return useQuery({
    queryKey: ['current-account', id, filters],
    queryFn: async (): Promise<AccountStatement> => {
      const params = new URLSearchParams()
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.limit) params.set('limit', String(filters.limit))
      if (filters?.from) params.set('from', filters.from)
      if (filters?.to) params.set('to', filters.to)

      const res = await fetch(`/api/current-accounts/${id}?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al obtener detalle de cuenta')
      }
      const json = await res.json()
      return json.data
    },
    enabled: !!id,
  })
}
