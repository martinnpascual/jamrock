'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SaleFormData } from '@/lib/validations/sale'

export type Sale = {
  id: string; product_id: string | null; member_id: string | null
  quantity: number; unit_price: number; total: number
  payment_method: string | null; created_at: string; is_deleted: boolean
  commercial_products?: { name: string } | null
  members?: { first_name: string; last_name: string; member_number: string } | null
}

const QK = 'sales'

export function useSales(limit = 100) {
  return useQuery({
    queryKey: [QK, limit],
    queryFn: async (): Promise<Sale[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('sales')
        .select('*, commercial_products!sales_product_id_fkey(name), members!sales_member_id_fkey(first_name, last_name, member_number)')
        .eq('is_deleted', false).order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: SaleFormData) => {
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] })
      qc.invalidateQueries({ queryKey: ['commercial_products'] })
    },
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/sales?id=' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
