'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useRole } from '@/hooks/useRole'
import { useAppConfig } from '@/hooks/useAppConfig'
import { useSaveAppConfig } from '@/hooks/useAppConfig'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkSession, WorkSessionProfile, WorkSessionSummary } from '@/hooks/useWorkSessions'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function useMonthSessions(month: string) {
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

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function toCSV(rows: string[][], headers: string[]): string {
  const escape = (v: string) => `"${(v ?? '').toString().replace(/"/g, '""')}"`
  return [headers.map(escape), ...rows.map(r => r.map(escape))].join('\n')
}

export default function HorasPage() {
  const { role } = useRole()
  const isGerente = role === 'gerente'

  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [selectedUser, setSelectedUser] = useState<WorkSessionSummary | null>(null)
  const [hourlyRate, setHourlyRate] = useState('')
  const [rateSaved, setRateSaved] = useState(false)

  const { data: rawData, isLoading } = useMonthSessions(month)
  const { data: config } = useAppConfig()
  const saveConfig = useSaveAppConfig()

  // Initialize hourly rate from config
  useMemo(() => {
    if (config?.hourly_rate_secretaria) {
      try {
        const v = typeof config.hourly_rate_secretaria === 'string'
          ? JSON.parse(config.hourly_rate_secretaria)
          : config.hourly_rate_secretaria
        setHourlyRate(String(v?.amount ?? 0))
      } catch {
        setHourlyRate('0')
      }
    }
  }, [config])

  // Build summaries per user
  const summaries = useMemo((): WorkSessionSummary[] => {
    if (!rawData) return []
    const { sessions, profiles } = rawData
    const profileMap = new Map(profiles.map((p) => [p.id, p]))
    const byUser = new Map<string, WorkSession[]>()
    for (const s of sessions) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
      byUser.get(s.user_id)!.push(s)
    }
    return Array.from(byUser.entries())
      .map(([user_id, userSessions]) => {
        const profile = profileMap.get(user_id)
        const completedSessions = userSessions.filter((s) => s.duration_minutes != null)
        const total_minutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
        return {
          user_id,
          full_name: profile?.full_name ?? 'Usuario desconocido',
          role: profile?.role ?? '—',
          total_minutes,
          session_count: userSessions.length,
          sessions: userSessions,
        }
      })
      .sort((a, b) => b.total_minutes - a.total_minutes)
  }, [rawData])

  const rate = parseFloat(hourlyRate) || 0

  async function saveHourlyRate() {
    try {
      await saveConfig.mutateAsync({ hourly_rate_secretaria: JSON.stringify({ amount: rate, currency: 'ARS' }) })
      setRateSaved(true)
      setTimeout(() => setRateSaved(false), 3000)
    } catch {}
  }

  function handleExportCSV() {
    const rows = summaries.map((s) => [
      s.full_name,
      s.role,
      String(s.session_count),
      formatMinutes(s.total_minutes),
      String((s.total_minutes / 60).toFixed(2)),
      ARS((s.total_minutes / 60) * rate),
    ])
    const csv = toCSV(rows, ['Nombre', 'Rol', 'Sesiones', 'Tiempo', 'Horas (decimal)', `Monto (${ARS(rate)}/h)`])
    downloadCSV(csv, `horas_${month}.csv`)
  }

  if (!isGerente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Lock className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">Solo el gerente puede acceder a esta sección.</p>
        <Link href="/configuracion">
          <Button variant="outline" size="sm">Volver a Configuración</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/configuracion">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 hover:text-slate-200 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Horas trabajadas
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de sesiones por operador y cálculo de sueldo
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={summaries.length === 0}
          variant="outline"
          className="gap-2 border-[#2DC814]/30 text-[#2DC814] hover:bg-[#2DC814]/10"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Mes
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm bg-[#111] border border-white/[0.1] text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Tarifa horaria ($)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={100}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="ej: 2500"
              className="h-9 w-36"
            />
            <Button
              size="sm"
              onClick={saveHourlyRate}
              disabled={saveConfig.isPending}
              className="bg-green-600 hover:bg-green-700 text-white h-9"
            >
              {saveConfig.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
            </Button>
            {rateSaved && <span className="text-xs text-green-500">Guardado ✓</span>}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Clock className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">Sin sesiones registradas para este mes.</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-white/[0.03] border-b border-white/[0.05] text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Operador</span>
            <span>Rol</span>
            <span>Sesiones</span>
            <span>Tiempo total</span>
            <span>Monto</span>
            <span />
          </div>

          <div className="divide-y divide-white/[0.04]">
            {summaries.map((s) => {
              const monto = (s.total_minutes / 60) * rate
              return (
                <div
                  key={s.user_id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-sky-900/40 rounded-full flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-200 truncate">{s.full_name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs w-fit capitalize',
                      s.role === 'gerente' ? 'text-purple-400 border-purple-500/20' :
                      s.role === 'secretaria' ? 'text-blue-400 border-blue-500/20' :
                      'text-green-400 border-green-500/20'
                    )}
                  >
                    {s.role}
                  </Badge>
                  <span className="text-sm text-slate-400">{s.session_count}</span>
                  <span className="text-sm font-semibold text-slate-200">{formatMinutes(s.total_minutes)}</span>
                  <span className={cn('text-sm font-bold', monto > 0 ? 'text-[#2DC814]' : 'text-slate-500')}>
                    {monto > 0 ? ARS(monto) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(selectedUser?.user_id === s.user_id ? null : s)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                  >
                    {selectedUser?.user_id === s.user_id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Session detail modal */}
      <Dialog open={!!selectedUser} onOpenChange={(o) => { if (!o) setSelectedUser(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Sesiones de {selectedUser?.full_name}
              <span className="text-slate-500 font-normal text-sm ml-1">— {month}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && <SessionDetail summary={selectedUser} rate={rate} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SessionDetail({ summary, rate }: { summary: WorkSessionSummary; rate: number }) {
  // Group sessions by day
  const byDay = useMemo(() => {
    const map = new Map<string, WorkSession[]>()
    for (const s of summary.sessions) {
      const day = s.login_at.split('T')[0]
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [summary.sessions])

  const totalMonto = (summary.total_minutes / 60) * rate

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
          <p className="text-xs text-slate-500">Tiempo total</p>
          <p className="text-lg font-bold text-slate-200 mt-0.5">{formatMinutes(summary.total_minutes)}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
          <p className="text-xs text-slate-500">Sesiones</p>
          <p className="text-lg font-bold text-slate-200 mt-0.5">{summary.session_count}</p>
        </div>
        <div className="bg-[#2DC814]/5 rounded-lg p-3 border border-[#2DC814]/20">
          <p className="text-xs text-slate-500">Monto a cobrar</p>
          <p className="text-lg font-bold text-[#2DC814] mt-0.5">{totalMonto > 0 ? ARS(totalMonto) : '—'}</p>
        </div>
      </div>

      {/* Day-by-day */}
      <div className="space-y-3">
        {byDay.map(([day, daySessions]) => {
          const dayMinutes = daySessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
          return (
            <div key={day} className="border border-white/[0.05] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03]">
                <span className="text-sm font-medium text-slate-300">
                  {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="text-xs text-slate-500">{formatMinutes(dayMinutes)}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {daySessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{new Date(s.login_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>→</span>
                      <span>
                        {s.logout_at
                          ? new Date(s.logout_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-amber-400">En curso</span>
                        }
                      </span>
                    </div>
                    <span className="text-slate-300 font-medium tabular-nums">
                      {s.duration_minutes != null ? formatMinutes(s.duration_minutes) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
