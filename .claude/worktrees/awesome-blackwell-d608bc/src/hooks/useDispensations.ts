'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useDispensations(limit = 50) {
  return useQuery({
    queryKey: ['dispensations', limit],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dispensations')
        .select(`
          id, dispensation_number, quantity_grams, genetics, type,
          notes, created_at,
          price_per_gram, subtotal, discount_percent, discount_amount,
          total_amount, payment_method, payment_status,
          members!dispensations_member_id_fkey (
            id, member_number, first_name, last_name, reprocann_status
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}

export function useTodayDispensations() {
  return useQuery({
    queryKey: ['dispensations', 'today'],
    queryFn: async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('dispensations')
        .select(`
          *,
          members!dispensations_member_id_fkey (
            id, member_number, first_name, last_name
          )
        `)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}
