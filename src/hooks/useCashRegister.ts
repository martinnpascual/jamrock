'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type CashRegister = {
  id: string; register_date: string; expected_total: number
  actual_total: number | null; difference: number | null
  status: 'abierta' | 'cerrada'; closed_by: string | null
  closed_at: string | null; notes: string | null; created_at: string
}

export type CashStats = {
  sales_total: number; payments_total: number; expected_total: number
  sales_count: number; payments_count: number
}

const QK = 'cash_register'

export function useTodayCashRegister() {
  return useQuery({
    queryKey: [QK, 'today'],
    queryFn: async (): Promise<{ register: CashRegister | null; today: string; stats: CashStats }> => {
      const res = await fetch('/api/cash-register')
      if (!res.ok) throw new Error('Error al cargar caja')
      return res.json()
    },
    refetchInterval: 30000,
  })
}

export function useOpenCashRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cash-register', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useCloseCashRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: { id: string; actual_total: number; notes?: string }) => {
      const res = await fetch('/api/cash-register', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
