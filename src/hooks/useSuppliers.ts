'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SupplierFormData } from '@/lib/validations/supplier'

export type Supplier = {
  id: string; name: string; type: 'medicinal' | 'comercial' | 'ambos'
  contact_name: string | null; phone: string | null; email: string | null
  notes: string | null; created_at: string; is_deleted: boolean
}

export type SupplyRecord = {
  id: string; supplier_id: string; description: string
  quantity: number | null; unit_cost: number | null; total_cost: number | null
  impacts_stock: string | null; created_at: string
}

const QK = 'suppliers'

export function useSuppliers() {
  return useQuery({
    queryKey: [QK],
    queryFn: async (): Promise<Supplier[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('suppliers').select('*')
        .eq('is_deleted', false).order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSupplierRecords(supplierId: string) {
  return useQuery({
    queryKey: [QK, 'records', supplierId],
    queryFn: async (): Promise<SupplyRecord[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('supply_records').select('*')
        .eq('supplier_id', supplierId).eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!supplierId,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: SupplierFormData) => {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/suppliers?id=' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
