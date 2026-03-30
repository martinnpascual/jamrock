'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Dispensation } from '@/types/database'

export function useMemberDispensations(memberId: string) {
  return useQuery({
    queryKey: ['dispensations', 'member', memberId],
    queryFn: async (): Promise<Dispensation[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dispensations')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data ?? []
    },
    enabled: !!memberId,
  })
}

export function useMemberPayments(memberId: string) {
  return useQuery({
    queryKey: ['payments', 'member', memberId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data ?? []
    },
    enabled: !!memberId,
  })
}
