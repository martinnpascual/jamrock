'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useAlertCounts() {
  return useQuery({
    queryKey: ['alert-counts'],
    queryFn: async () => {
      const supabase = createClient()
      const [solicitudesRes, vencidosRes] = await Promise.all([
        supabase
          .from('enrollment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendiente'),
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false)
          .eq('reprocann_status', 'en_tramite'),
      ])
      return {
        solicitudes: solicitudesRes.count ?? 0,
        vencidos: vencidosRes.count ?? 0,
      }
    },
    staleTime: 60_000,   // 1 minuto — no se necesita exactitud al segundo
    refetchInterval: 120_000,
  })
}
