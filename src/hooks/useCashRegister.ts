'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type CashRegister = {
  id: string; register_date: string; expected_total: number
  actual_total: number | null; difference: number | null
  status: 'abierta' | 'cerrada'; shift: 'mañana' | 'tarde'
  closed_by: string | null; closed_at: string | null
  notes: string | null; created_at: string; created_by: string | null
}

export type CashStats = {
  sales_total: number; payments_total: number; expected_total: number
  sales_count: number; payments_count: number
}

export type CashSummary = {
  has_open: boolean
  open_shift: 'mañana' | 'tarde' | null
  morning: CashRegister | null
  afternoon: CashRegister | null
  total_expected: number
  total_actual: number | null
  total_difference: number | null
}

export type CashRegisterResponse = {
  registers: CashRegister[]
  today: string
  stats: CashStats
  summary: CashSummary
}

const QK = 'cash_register'

export function useTodayCashRegister() {
  return useQuery({
    queryKey: [QK, 'today'],
    queryFn: async (): Promise<CashRegisterResponse> => {
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
    mutationFn: async (shift: 'mañana' | 'tarde') => {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift }),
      })
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
      const res = await fetch('/api/cash-register', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useReopenCashRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/cash-register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
