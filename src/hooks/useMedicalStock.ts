'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useMedicalStockLots() {
  return useQuery({
    queryKey: ['medical_stock_lots'],
    queryFn: async () => {
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
