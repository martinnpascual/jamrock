'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { EventFormData } from '@/lib/validations/event'

export interface EventRow {
  id: string
  name: string
  description: string | null
  event_date: string
  location: string | null
  total_cost: number
  total_income: number
  status: 'planificado' | 'activo' | 'cerrado' | 'cancelado'
  created_at: string
  is_deleted: boolean
  event_attendees?: { count: number }[]
}

export interface Attendee {
  id: string
  attended: boolean
  notes: string | null
  members: {
    id: string
    first_name: string
    last_name: string
    member_number: string
  } | null
}

// ── Listar eventos ────────────────────────────────────────────
export function useEvents() {
  return useQuery<EventRow[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events')
      if (!res.ok) throw new Error('Error cargando eventos')
      return res.json()
    },
  })
}

// ── Crear evento ──────────────────────────────────────────────
export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error creando evento') }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ── Eliminar evento (soft) ────────────────────────────────────
export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error eliminando evento') }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ── Actualizar estado evento ──────────────────────────────────
export function useUpdateEventStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error actualizando estado') }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ── Asistentes de un evento ───────────────────────────────────
export function useEventAttendees(eventId: string | null) {
  return useQuery<Attendee[]>({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/attendees`)
      if (!res.ok) throw new Error('Error cargando asistentes')
      return res.json()
    },
    enabled: !!eventId,
  })
}

// ── Agregar asistente ─────────────────────────────────────────
export function useAddAttendee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, memberId }: { eventId: string; memberId: string }) => {
      const res = await fetch(`/api/events/${eventId}/attendees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: memberId }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error agregando asistente') }
      return res.json()
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['event-attendees', vars.eventId] }),
  })
}

// ── Marcar asistencia ─────────────────────────────────────────
export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, attendeeId, attended }: { eventId: string; attendeeId: string; attended: boolean }) => {
      const res = await fetch(`/api/events/${eventId}/attendees`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendee_id: attendeeId, attended }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error') }
      return res.json()
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['event-attendees', vars.eventId] }),
  })
}

// ── Quitar asistente ──────────────────────────────────────────
export function useRemoveAttendee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, attendeeId }: { eventId: string; attendeeId: string }) => {
      const res = await fetch(`/api/events/${eventId}/attendees?attendee_id=${attendeeId}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error') }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['event-attendees', vars.eventId] }),
  })
}

// ── Supabase realtime (para el calendario) ────────────────────
export function useEventsForMonth(year: number, month: number) {
  const supabase = createClient()
  const start = new Date(year, month, 1).toISOString()
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return useQuery<EventRow[]>({
    queryKey: ['events-month', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date, status, location')
        .eq('is_deleted', false)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true })
      if (error) throw error
      return data as EventRow[]
    },
  })
}
