import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface AlertCounts {
  solicitudesPendientes: number
  reprocannVencidos: number
}

export function useAlertCounts(): AlertCounts {
  const supabase = createClient()

  const { data: solicitudes } = useQuery({
    queryKey: ['alert-solicitudes'],
    queryFn: async () => {
      const { count } = await supabase
        .from('enrollment_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendiente')
      return count ?? 0
    },
    staleTime: 60_000,
  })

  const { data: vencidos } = useQuery({
    queryKey: ['alert-reprocann-vencidos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('reprocann_status', 'vencido')
      return count ?? 0
    },
    staleTime: 60_000,
  })

  return {
    solicitudesPendientes: solicitudes ?? 0,
    reprocannVencidos: vencidos ?? 0,
  }
}
