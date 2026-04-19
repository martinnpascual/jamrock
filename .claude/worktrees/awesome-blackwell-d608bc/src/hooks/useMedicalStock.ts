'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { StockLotFormData } from '@/lib/validations/stock'

export type MedicalStockLot = {
  id: string
  genetics: string
  initial_grams: number
  current_grams: number
  cost_per_gram: number | null
  price_per_gram: number
  lot_date: string
  notes: string | null
  created_at: string
  is_deleted: boolean
}

const QUERY_KEY = 'medical_stock_lots'

export function useMedicalStockLots() {
  return useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: async (): Promise<MedicalStockLot[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('medical_stock_lots')
        .select('*')
        .eq('is_deleted', false)
        .gt('current_grams', 0)
        .order('lot_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAllStockLots() {
  return useQuery({
    queryKey: [QUERY_KEY, 'all'],
    queryFn: async (): Promise<MedicalStockLot[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('medical_stock_lots')
        .select('*')
        .eq('is_deleted', false)
        .order('lot_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateStockLot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (formData: StockLotFormData) => {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al crear lote')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteStockLot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/stock?id=' + id, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al dar de baja lote')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useLotMovements(lotId: string) {
  return useQuery({
    queryKey: ['lot_movements', lotId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dispensations')
        .select('dispensation_number, quantity_grams, genetics, created_at, type, members!dispensations_member_id_fkey(first_name, last_name, member_number)')
        .eq('lot_id', lotId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!lotId,
  })
}
