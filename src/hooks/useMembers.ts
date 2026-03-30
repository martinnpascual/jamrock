'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types/database'
import type { MemberFormData } from '@/lib/validations/member'

const QUERY_KEY = 'members'

export function useMembers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<Member[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const payload = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        address: formData.address || null,
        reprocann_expiry: formData.reprocann_expiry || null,
        reprocann_number: formData.reprocann_number || null,
        notes: formData.notes || null,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('members')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data as Member
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Soft delete — nunca DELETE físico
      const { error } = await supabase
        .from('members')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', id)

      if (error) throw error
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
