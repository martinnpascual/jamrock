'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ProductFormData } from '@/lib/validations/sale'

export type Product = {
  id: string; name: string; description: string | null; category: string | null
  price: number; stock_quantity: number; low_stock_threshold: number
  created_at: string; is_deleted: boolean
}

const QK = 'commercial_products'

export function useProducts() {
  return useQuery({
    queryKey: [QK],
    queryFn: async (): Promise<Product[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('commercial_products').select('*')
        .eq('is_deleted', false).order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: ProductFormData) => {
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...d }: Partial<ProductFormData> & { id: string }) => {
      const res = await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...d }) })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/products?id=' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
