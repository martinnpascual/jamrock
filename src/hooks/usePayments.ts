'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PaymentFormData } from '@/lib/validations/payment'

export type Payment = {
  id: string
  member_id: string
  amount: number
  concept: string
  payment_method: string | null
  notes: string | null
  created_at: string
  members?: { first_name: string; last_name: string; member_number: string } | null
}

const QUERY_KEY = 'payments'

export function usePayments(limit = 100) {
  return useQuery({
    queryKey: [QUERY_KEY, limit],
    queryFn: async (): Promise<Payment[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('payments')
        .select('*, members!payments_member_id_fkey(first_name, last_name, member_number)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMemberPayments(memberId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'member', memberId],
    queryFn: async (): Promise<Payment[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!memberId,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: PaymentFormData) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al registrar pago')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/payments?id=' + id, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al anular pago')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
