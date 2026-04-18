'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const EXPENSE_CATEGORIES = [
  { value: 'sueldo',        label: 'Sueldo / Personal' },
  { value: 'limpieza',      label: 'Limpieza' },
  { value: 'servicios',     label: 'Servicios (luz, gas, internet)' },
  { value: 'alquiler',      label: 'Alquiler' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'compras',       label: 'Compras / Insumos' },
  { value: 'retiro',        label: 'Retiro de efectivo' },
  { value: 'otro',          label: 'Otro' },
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']

export interface CashExpense {
  id:          string
  register_id: string | null
  category:    ExpenseCategory
  description: string
  amount:      number
  notes:       string | null
  created_at:  string
  profiles:    { full_name: string } | null
}

interface CreateExpenseInput {
  category:    ExpenseCategory
  description: string
  amount:      number
  notes?:      string
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCashExpenses(date?: string) {
  const d = date ?? new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['cash-expenses', d],
    queryFn:  async () => {
      const res  = await fetch(`/api/cash-register/expenses?date=${d}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al obtener egresos')
      return data as { expenses: CashExpense[]; total: number }
    },
    staleTime: 30_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const res  = await fetch('/api/cash-register/expenses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al registrar egreso')
      return data.expense as CashExpense
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-expenses'] })
      qc.invalidateQueries({ queryKey: ['cash-register'] })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res  = await fetch(`/api/cash-register/expenses?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar egreso')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-expenses'] })
    },
  })
}
