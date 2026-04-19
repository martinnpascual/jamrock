'use client'

import { useQuery } from '@tanstack/react-query'

export type WorkSession = {
  id: string
  user_id: string
  login_at: string
  logout_at: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export type WorkSessionProfile = {
  id: string
  full_name: string
  role: string
}

export type WorkSessionSummary = {
  user_id: string
  full_name: string
  role: string
  total_minutes: number
  session_count: number
  sessions: WorkSession[]
}

export function useWorkSessions(month: string) {
  return useQuery({
    queryKey: ['work_sessions', month],
    queryFn: async (): Promise<{ sessions: WorkSession[]; profiles: WorkSessionProfile[] }> => {
      const res = await fetch(`/api/work-sessions?month=${month}`)
      if (!res.ok) throw new Error('Error al cargar sesiones')
      return res.json()
    },
    enabled: !!month,
  })
}

export function useWorkSessionsByUser(month: string, userId: string) {
  return useQuery({
    queryKey: ['work_sessions', month, userId],
    queryFn: async (): Promise<{ sessions: WorkSession[]; profiles: WorkSessionProfile[] }> => {
      const res = await fetch(`/api/work-sessions?month=${month}&user_id=${userId}`)
      if (!res.ok) throw new Error('Error al cargar sesiones')
      return res.json()
    },
    enabled: !!month && !!userId,
  })
}
