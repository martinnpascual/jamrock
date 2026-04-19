'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useAlertCounts() {
  return useQuery({
    queryKey: ['alert-counts'],
    queryFn: async () => {
      const supabase = createClient()

      // Fecha dentro de 30 días para detectar REPROCANN próximo a vencer
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)
      const in30DaysStr = in30Days.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const [solicitudesRes, vencidosRes, porVencerRes, stockBajoRes] = await Promise.all([
        supabase
          .from('enrollment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendiente'),
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false)
          .eq('reprocann_status', 'vencido'),
        // REPROCANN activo pero a punto de vencer en 30 días
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false)
          .eq('reprocann_status', 'activo')
          .not('reprocann_expiry', 'is', null)
          .lte('reprocann_expiry', in30DaysStr)
          .gte('reprocann_expiry', todayStr),
        // Productos comerciales con stock bajo
        supabase
          .from('commercial_products')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false)
          .filter('stock_quantity', 'lte', 'low_stock_threshold'),
      ])

      return {
        solicitudes: solicitudesRes.count ?? 0,
        vencidos:    vencidosRes.count ?? 0,
        porVencer:   porVencerRes.count ?? 0,
        stockBajo:   stockBajoRes.count ?? 0,
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

/** Hook para obtener socios con REPROCANN vencido O por vencer (detalle) */
export function useReprocannAlerts() {
  return useQuery({
    queryKey: ['reprocann-alerts'],
    queryFn: async () => {
      const supabase = createClient()
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)
      const in30DaysStr = in30Days.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const [vencidosRes, porVencerRes] = await Promise.all([
        supabase
          .from('members')
          .select('id, member_number, first_name, last_name, reprocann_expiry, reprocann_status')
          .eq('is_deleted', false)
          .eq('reprocann_status', 'vencido')
          .order('reprocann_expiry', { ascending: true })
          .limit(10),
        supabase
          .from('members')
          .select('id, member_number, first_name, last_name, reprocann_expiry, reprocann_status')
          .eq('is_deleted', false)
          .eq('reprocann_status', 'activo')
          .not('reprocann_expiry', 'is', null)
          .lte('reprocann_expiry', in30DaysStr)
          .gte('reprocann_expiry', todayStr)
          .order('reprocann_expiry', { ascending: true })
          .limit(10),
      ])

      return {
        vencidos:  (vencidosRes.data  ?? []) as Array<{ id: string; member_number: string; first_name: string; last_name: string; reprocann_expiry: string | null; reprocann_status: string }>,
        porVencer: (porVencerRes.data ?? []) as Array<{ id: string; member_number: string; first_name: string; last_name: string; reprocann_expiry: string | null; reprocann_status: string }>,
      }
    },
    staleTime: 120_000,
    refetchInterval: 300_000, // cada 5 minutos
  })
}
