'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/database'
import type { MemberFormData } from '@/lib/validations/member'

const QUERY_KEY = 'members'

export function useMembers(limit = 500) {
  return useQuery({
    queryKey: [QUERY_KEY, limit],
    queryFn: async (): Promise<Member[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,          // 5 min — sirve mientras hay conexión
    gcTime:    24 * 60 * 60 * 1000,    // 24 h — cacheo offline
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<Member | null> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: MemberFormData) => {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al crear socio')
      }
      return res.json() as Promise<Member>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
    onError: (error: Error) => {
      console.error('Error al crear socio:', error.message)
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<MemberFormData> }) => {
      const supabase = createClient()

      const payload = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        reprocann_expiry: formData.reprocann_expiry || null,
        reprocann_number: formData.reprocann_number || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('members')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Member
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/members?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al eliminar socio')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// Hook para buscar socio por QR code (para dispensas)
export function useMemberByQR(qrCode: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'qr', qrCode],
    queryFn: async (): Promise<Member | null> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('is_deleted', false)
        .single()

      if (error) return null
      return data
    },
    enabled: !!qrCode,
  })
}
