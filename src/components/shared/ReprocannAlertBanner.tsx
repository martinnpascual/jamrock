'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
import { useReprocannAlerts } from '@/hooks/useAlertCounts'
import { cn } from '@/lib/utils'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReprocannAlertBanner() {
  const { data, isLoading } = useReprocannAlerts()
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (isLoading || dismissed) return null
  if (!data) return null

  const totalAlerts = data.vencidos.length + data.porVencer.length
  if (totalAlerts === 0) return null

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      data.vencidos.length > 0
        ? 'border-red-900/50 bg-red-950/20'
        : 'border-amber-900/50 bg-amber-950/20'
    )}>
      {/* Header siempre visible */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            data.vencidos.length > 0 ? 'bg-red-900/40' : 'bg-amber-900/40'
          )}>
            <AlertTriangle className={cn(
              'w-4 h-4',
              data.vencidos.length > 0 ? 'text-red-400' : 'text-amber-400'
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {data.vencidos.length > 0 && (
                <span className="text-sm font-semibold text-red-300">
                  {data.vencidos.length} REPROCANN vencido{data.vencidos.length > 1 ? 's' : ''}
                </span>
              )}
              {data.vencidos.length > 0 && data.porVencer.length > 0 && (
                <span className="text-slate-600">·</span>
              )}
              {data.porVencer.length > 0 && (
                <span className="text-sm font-medium text-amber-300">
                  {data.porVencer.length} vencen en 30 días
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {expanded ? 'Hacé click para ocultar' : 'Hacé click para ver socios afectados'}
            </p>
          </div>
          <div className="text-slate-500 flex-shrink-0 ml-2">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          title="Cerrar alerta"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lista expandible */}
      {expanded && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {/* Vencidos */}
          {data.vencidos.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-red-900/40 flex items-center justify-center text-[10px] font-bold text-red-400 flex-shrink-0">
                  {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{m.first_name} {m.last_name}</p>
                  <p className="text-[10px] text-slate-500">{m.member_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-red-400 font-medium">Vencido {formatExpiry(m.reprocann_expiry)}</span>
                <Link href={`/socios/${m.id}`} className="text-slate-500 hover:text-[#2DC814] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {/* Por vencer */}
          {data.porVencer.map(m => {
            const days = daysUntil(m.reprocann_expiry)
            return (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-amber-900/40 flex items-center justify-center text-[10px] font-bold text-amber-400 flex-shrink-0">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.first_name} {m.last_name}</p>
                    <p className="text-[10px] text-slate-500">{m.member_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{formatExpiry(m.reprocann_expiry)}</span>
                  <Link href={`/socios/${m.id}`} className="text-slate-500 hover:text-[#2DC814] transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Acción */}
          <div className="px-4 py-2.5">
            <Link
              href="/socios?status=vencido"
              className="text-xs text-[#2DC814] hover:underline flex items-center gap-1"
            >
              Ver todos los socios con REPROCANN vencido <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
