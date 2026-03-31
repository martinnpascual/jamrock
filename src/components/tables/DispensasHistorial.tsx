'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useDispensations } from '@/hooks/useDispensations'
import { useRole } from '@/hooks/useRole'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, Plus, Syringe, Lock, XCircle } from 'lucide-react'
import type { ReprocannStatus } from '@/types/database'
import { cn } from '@/lib/utils'

type DispensationWithMember = {
  id: string
  dispensation_number: string
  quantity_grams: number
  genetics: string
  type: 'normal' | 'anulacion'
  notes: string | null
  created_at: string
  members: {
    id: string
    member_number: string
    first_name: string
    last_name: string
    reprocann_status: ReprocannStatus
  } | null
}

export function DispensasHistorial() {
  const { data, isLoading, error } = useDispensations(100)
  const { isGerente } = useRole()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Void dialog state
  const [voidTarget, setVoidTarget] = useState<DispensationWithMember | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  const dispensations = useMemo(
    () => (data ?? []) as DispensationWithMember[],
    [data]
  )

  const filtered = useMemo(() => {
    if (!search) return dispensations
    const q = search.toLowerCase()
    return dispensations.filter((d) => {
      const memberName = d.members
        ? `${d.members.first_name} ${d.members.last_name}`.toLowerCase()
        : ''
      return (
        memberName.includes(q) ||
        d.dispensation_number.toLowerCase().includes(q) ||
        d.genetics.toLowerCase().includes(q) ||
        d.members?.member_number.toLowerCase().includes(q)
      )
    })
  }, [dispensations, search])

  // Stats de hoy
  const today = new Date().toISOString().split('T')[0]
  const todayDispensations = dispensations.filter(
    (d) => d.created_at.startsWith(today) && d.type === 'normal'
  )
  const todayGrams = todayDispensations.reduce((sum, d) => sum + (d.quantity_grams ?? 0), 0)

  function openVoidDialog(d: DispensationWithMember) {
    setVoidTarget(d)
    setVoidReason('')
    setVoidError(null)
  }

  function closeVoidDialog() {
    setVoidTarget(null)
    setVoidReason('')
    setVoidError(null)
  }

  async function handleConfirmVoid() {
    if (!voidTarget) return
    if (voidReason.trim().length < 10) {
      setVoidError('El motivo debe tener al menos 10 caracteres.')
      return
    }
    setVoidLoading(true)
    setVoidError(null)
    try {
      const res = await fetch('/api/dispensations/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispensation_id: voidTarget.id, reason: voidReason.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setVoidError(body.error ?? 'Error al anular la dispensa.')
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['dispensations'] })
      closeVoidDialog()
    } catch {
      setVoidError('Error de red. Intentá nuevamente.')
    } finally {
      setVoidLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500 text-sm">
        Error al cargar dispensas. Reintentá.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats del día */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Dispensas hoy"
          value={todayDispensations.length.toString()}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Gramos dispensados hoy"
          value={`${todayGrams.toFixed(1)}g`}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard
          label="Total historial"
          value={dispensations.filter((d) => d.type === 'normal').length.toString()}
          color="text-slate-600"
          bg="bg-slate-50"
        />
      </div>

      {/* Barra de acciones */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por socio, DISP-XXXX o genética..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Link href="/dispensas/nueva">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />
            Nueva dispensa
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
          <Lock className="w-3.5 h-3.5" />
          <span>Registro inmutable</span>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className={cn(
            'hidden gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide',
            isGerente
              ? 'lg:grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto_auto]'
              : 'lg:grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto]'
          )}>
            <span>N°</span>
            <span>Socio</span>
            <span>Genética</span>
            <span>Gramos</span>
            <span>Fecha</span>
            <span>Tipo</span>
            {isGerente && <span />}
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <DispensationRow
                key={d.id}
                dispensation={d}
                isGerente={isGerente}
                onVoid={openVoidDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dialog de confirmación de anulación */}
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) closeVoidDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Anular dispensa
            </DialogTitle>
            <DialogDescription>
              Esta acción creará un registro de anulación para{' '}
              <span className="font-semibold text-slate-700">
                {voidTarget?.dispensation_number}
              </span>
              . El registro original permanece inmutable (REPROCANN).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-slate-700">
              Motivo de anulación <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Describí el motivo de la anulación (mínimo 10 caracteres)..."
              value={voidReason}
              onChange={(e) => {
                setVoidReason(e.target.value)
                if (voidError) setVoidError(null)
              }}
              rows={3}
              className={cn(voidError ? 'border-red-400 focus-visible:ring-red-400' : '')}
            />
            {voidError && (
              <p className="text-xs text-red-500">{voidError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeVoidDialog} disabled={voidLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmVoid}
              disabled={voidLoading || voidReason.trim().length < 10}
            >
              {voidLoading ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DispensationRow({
  dispensation: d,
  isGerente,
  onVoid,
}: {
  dispensation: DispensationWithMember
  isGerente: boolean
  onVoid: (d: DispensationWithMember) => void
}) {
  const isAnulacion = d.type === 'anulacion'

  return (
    <div className={cn(
      'grid grid-cols-1 gap-2 px-4 py-3 items-center',
      isGerente
        ? 'lg:grid-cols-[auto_2fr_1fr_1fr_1fr_auto_auto] lg:gap-4'
        : 'lg:grid-cols-[auto_2fr_1fr_1fr_1fr_auto] lg:gap-4',
      isAnulacion ? 'bg-red-50 opacity-70' : 'hover:bg-slate-50'
    )}>
      {/* N° */}
      <span className="font-mono text-xs font-semibold text-slate-600">
        {d.dispensation_number}
      </span>

      {/* Socio */}
      <div className="flex items-center gap-2.5">
        {d.members ? (
          <>
            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-500 flex-shrink-0">
              {d.members.first_name.charAt(0)}{d.members.last_name.charAt(0)}
            </div>
            <div>
              <Link
                href={`/socios/${d.members.id}`}
                className="text-sm font-medium text-slate-800 hover:text-green-600 transition-colors"
              >
                {d.members.first_name} {d.members.last_name}
              </Link>
              <p className="text-xs text-slate-400">{d.members.member_number}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-400 italic">—</span>
        )}
      </div>

      {/* Genética */}
      <span className="text-sm text-slate-700">{d.genetics}</span>

      {/* Gramos */}
      <span className={cn(
        'text-sm font-semibold',
        isAnulacion ? 'text-red-500' : 'text-slate-800'
      )}>
        {isAnulacion ? '-' : ''}{d.quantity_grams}g
      </span>

      {/* Fecha */}
      <span className="text-xs text-slate-400">
        {new Date(d.created_at).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>

      {/* Tipo */}
      {isAnulacion ? (
        <Badge variant="destructive" className="text-xs">Anulación</Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-green-700 border-green-200">Normal</Badge>
      )}

      {/* Acción anular — solo gerente, solo dispensas normales */}
      {isGerente && (
        <div className="flex justify-end">
          {!isAnulacion && (
            <button
              type="button"
              title="Anular dispensa"
              onClick={() => onVoid(d)}
              className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-lg p-4 border border-transparent`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Syringe className="w-6 h-6 text-slate-400" />
      </div>
      {hasSearch ? (
        <p className="text-sm text-slate-500">Sin resultados para tu búsqueda.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700">Sin dispensas registradas</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Las dispensas aparecerán aquí una vez registradas.</p>
          <Link href="/dispensas/nueva">
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Primera dispensa
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
