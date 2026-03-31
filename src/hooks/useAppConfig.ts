'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type AppConfigMap = Record<string, string>

const QUERY_KEY = 'app_config'

export function useAppConfig() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<AppConfigMap> => {
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error('Error al cargar configuración')
      const body = await res.json()
      return body.config as AppConfigMap
    },
  })
}

export function useSaveAppConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: AppConfigMap) => {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al guardar configuración')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
