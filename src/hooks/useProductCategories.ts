'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const QK = 'product_categories'

export function useProductCategories() {
  return useQuery<string[]>({
    queryKey: [QK],
    queryFn: async () => {
      const res = await fetch('/api/product-categories')
      if (!res.ok) throw new Error('Error al cargar categorías')
      const json = await res.json()
      return json.categories as string[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProductCategories() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (categories: string[]) => {
      const res = await fetch('/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      })
      if (!res.ok) throw new Error('Error al guardar categorías')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] })
    },
  })
}
