'use client'

import { useState, useEffect, useCallback } from 'react'

export type OfflineDispensaJob = {
  id: string          // temp client-side id
  type: 'dispensa'
  memberId: string
  memberName: string
  lotId: string
  genetics: string
  quantityGrams: number
  notes?: string
  createdAt: string   // ISO string
}

const STORAGE_KEY = 'jamrock_offline_queue'

function loadQueue(): OfflineDispensaJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OfflineDispensaJob[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: OfflineDispensaJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage not available (SSR / private mode)
  }
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineDispensaJob[]>([])

  // Load on mount (client only)
  useEffect(() => {
    setQueue(loadQueue())
  }, [])

  const enqueue = useCallback((job: Omit<OfflineDispensaJob, 'id' | 'createdAt'>) => {
    const newJob: OfflineDispensaJob = {
      ...job,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    }
    setQueue(prev => {
      const next = [...prev, newJob]
      saveQueue(next)
      return next
    })
    return newJob.id
  }, [])

  const remove = useCallback((id: string) => {
    setQueue(prev => {
      const next = prev.filter(j => j.id !== id)
      saveQueue(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setQueue([])
    saveQueue([])
  }, [])

  return { queue, enqueue, remove, clearAll }
}
