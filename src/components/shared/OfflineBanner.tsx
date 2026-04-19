'use client'

import { WifiOff } from 'lucide-react'
import { useOnline } from '@/hooks/useOnline'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const online = useOnline()
  const { queue } = useOfflineQueue()

  if (online && queue.length === 0) return null

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all',
        !online
          ? 'bg-amber-950/90 border-b border-amber-800/60 text-amber-300'
          : 'bg-blue-950/90 border-b border-blue-800/60 text-blue-300'
      )}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      {!online ? (
        <span>
          Sin conexión — Los datos se guardan localmente
          {queue.length > 0 && (
            <span className="ml-2 bg-amber-800/60 px-1.5 py-0.5 rounded text-xs">
              {queue.length} dispensa{queue.length > 1 ? 's' : ''} en cola
            </span>
          )}
        </span>
      ) : (
        <span>
          Conexión restaurada —{' '}
          <span className="font-bold">
            {queue.length} dispensa{queue.length > 1 ? 's' : ''} pendiente{queue.length > 1 ? 's' : ''} de sincronizar
          </span>
        </span>
      )}
    </div>
  )
}
