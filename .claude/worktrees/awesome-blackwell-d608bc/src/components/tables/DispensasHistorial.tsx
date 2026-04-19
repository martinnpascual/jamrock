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

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

type PaymentStatus = 'sin_cargo' | 'pagado' | 'fiado' | null | undefined

type DispensationWithMember = {
  id: string
  dispensation_number: string
  quantity_grams: number
  genetics: string
  type: 'normal' | 'anulacion'
  notes: string | null
  created_at: string
  // Campos de precio (pueden ser null en registros viejos)
  price_per_gram:   number | null
  subtotal:         number | null
  discount_percent: number | null
  discount_amount:  number | null
  total_amount:     number | null
  payment_method:   string | null
  payment_status:   PaymentStatus
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
    () => (data ?? []) as unknown as DispensationWithMember[],
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
          color="text-sky-400"
          bg="bg-sky-900/30"
        />
        <StatCard
          label="Gramos hoy"
          value={`${todayGrams.toFixed(1)}g`}
          color="text-[#2DC814]"
          bg="bg-[#2DC814]/10"
        />
        <StatCard
          label="Total historial"
          value={dispensations.filter((d) => d.type === 'normal').length.toString()}
          color="text-slate-300"
          bg="bg-white/[0.04]"
        />
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por socio, DISP-XXXX o genética..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Link href="/dispensas/nueva" className="flex-shrink-0">
          <Button className="bg-[#2DC814] hover:bg-[#25a811] text-black font-bold gap-2 h-10 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nueva dispensa
          </Button>
        </Link>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
          <Lock className="w-3.5 h-3.5" />
          <span>Registro inmutable</span>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm">
          <div className={cn(
            'hidden gap-4 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05] text-xs font-medium text-slate-500 uppercase tracking-wide',
            isGerente
              ? 'lg:grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto_auto]'
              : 'lg:grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto]'
          )}>
            <span>N°</span>
            <span>Socio</span>
            <span>Genética</span>
            <span>Gramos</span>
            <span>Abonó</span>
            <span>Pago</span>
            <span>Fecha</span>
            <span>Tipo</span>
            {isGerente && <span />}
          </div>
          <div className="divide-y divide-white/[0.04]">
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
              <span className="font-semibold text-slate-200">
                {voidTarget?.dispensation_number}
              </span>
              . El registro original permanece inmutable (REPROCANN).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-slate-200">
              Motivo de anulación <span className="text-red-400">*</span>
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

function PaymentStatusBadge({ status, method, discountPct, amountPaid }: {
  status:      PaymentStatus
  method:      string | null
  discountPct: number | null
  amountPaid:  number | null
}) {
  if (!status || status === 'sin_cargo') {
    return <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">Sin cargo</Badge>
  }
  if (status === 'pagado') {
    const title = [
      method ? `vía ${method}` : null,
      amountPaid ? ARS(amountPaid) : null,
      discountPct && discountPct > 0 ? `Desc: ${discountPct}%` : null,
    ].filter(Boolean).join(' · ')
    return (
      <Badge
        variant="outline"
        className="text-xs text-[#2DC814] border-[#2DC814]/30 bg-[#2DC814]/5 cursor-default"
        title={title}
      >
        Pagado
      </Badge>
    )
  }
  // fiado
  return (
    <Badge variant="outline" className="text-xs text-amber-400 border-amber-700/50 bg-amber-950/20">
      Fiado
    </Badge>
  )
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
  cuenta_corriente: 'Cuenta corriente',
}

function buildPriceTooltip(d: DispensationWithMember): string {
  if (!d.total_amount || d.total_amount <= 0) return ''
  const lines: string[] = []
  if (d.price_per_gram && d.price_per_gram > 0) {
    lines.push(`${d.quantity_grams}g × ${ARS(d.price_per_gram)}/g = ${ARS(d.subtotal ?? d.total_amount)}`)
  }
  if (d.discount_percent && d.discount_percent > 0) {
    lines.push(`Desc: ${d.discount_percent}% (-${ARS(d.discount_amount ?? 0)})`)
  }
  if (d.payment_method) {
    lines.push(PAYMENT_METHOD_LABELS[d.payment_method] ?? d.payment_method)
  }
  return lines.join(' · ')
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
  const hasPrice    = d.total_amount != null && d.total_amount > 0

  return (
    <div className={cn(
      'px-4 py-3 transition-colors',
      isGerente
        ? 'lg:grid lg:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto_auto] lg:gap-4 lg:items-center'
        : 'lg:grid lg:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_auto] lg:gap-4 lg:items-center',
      isAnulacion ? 'bg-red-950/20 opacity-80' : 'hover:bg-white/[0.02]'
    )}>
      {/* Mobile layout — row with all info */}
      <div className="flex items-start justify-between gap-3 lg:contents">
        {/* Left: avatar + info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 lg:contents">
          {/* N° — hidden on mobile, shown in desktop grid */}
          <span className="hidden lg:block font-mono text-xs font-semibold text-slate-400">
            {d.dispensation_number}
          </span>

          {/* Socio */}
          <div className="flex items-center gap-2.5 min-w-0">
            {d.members ? (
              <>
                <div className="w-8 h-8 bg-[#2DC814]/10 rounded-full flex items-center justify-center text-xs font-semibold text-[#2DC814] flex-shrink-0">
                  {d.members.first_name.charAt(0)}{d.members.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/socios/${d.members.id}`}
                    className="text-sm font-medium text-slate-200 hover:text-[#2DC814] transition-colors truncate block"
                  >
                    {d.members.first_name} {d.members.last_name}
                  </Link>
                  {/* Mobile: N° + member_number inline */}
                  <p className="text-xs text-slate-500 lg:hidden">
                    <span className="font-mono font-semibold text-slate-400">{d.dispensation_number}</span>
                    {' · '}
                    {d.members.member_number}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-sm text-slate-500 italic">—</span>
            )}
          </div>
        </div>

        {/* Right side on mobile: grams + badges + action */}
        <div className="flex items-center gap-2 flex-shrink-0 lg:contents">
          {/* Genética — hidden on mobile */}
          <span className="hidden lg:block text-sm text-slate-300">{d.genetics}</span>

          {/* Gramos */}
          <span className={cn(
            'text-sm font-bold tabular-nums',
            isAnulacion ? 'text-red-400' : 'text-slate-100'
          )}>
            {isAnulacion ? '-' : ''}{d.quantity_grams}g
          </span>

          {/* ABONÓ — solo desktop */}
          <span className="hidden lg:block text-sm tabular-nums" title={buildPriceTooltip(d)}>
            {hasPrice ? (
              d.payment_status === 'fiado' ? (
                <span className="text-yellow-400 font-medium">
                  {ARS(d.total_amount!)} <span className="text-xs">(Fiado)</span>
                </span>
              ) : (
                <span className="text-green-400 font-medium">
                  {ARS(d.total_amount!)}
                  {d.discount_percent && d.discount_percent > 0 && (
                    <span className="ml-1 text-xs text-amber-400">-{d.discount_percent}%</span>
                  )}
                </span>
              )
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </span>

          {/* PAGO badge — solo desktop */}
          <span className="hidden lg:block">
            <PaymentStatusBadge
              status={d.payment_status}
              method={d.payment_method}
              discountPct={d.discount_percent}
              amountPaid={d.total_amount}
            />
          </span>

          {/* Fecha — hidden on mobile */}
          <span className="hidden lg:block text-xs text-slate-500">
            {new Date(d.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* Tipo badge */}
          {isAnulacion ? (
            <Badge variant="destructive" className="text-xs shrink-0">Anulación</Badge>
          ) : (
            <Badge variant="outline" className="text-xs shrink-0 text-[#2DC814] border-[#2DC814]/30">Normal</Badge>
          )}

          {/* Acción anular — solo gerente, solo dispensas normales */}
          {isGerente && (
            <div className="flex justify-end">
              {!isAnulacion && (
                <button
                  type="button"
                  title="Anular dispensa"
                  onClick={() => onVoid(d)}
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: genetics + date + pago — second line */}
      <div className="flex items-center gap-2 mt-1 lg:hidden pl-10 flex-wrap">
        <span className="text-xs text-slate-400">{d.genetics}</span>
        <span className="text-slate-600">·</span>
        {hasPrice && (
          <span className={cn('text-xs font-medium', d.payment_status === 'fiado' ? 'text-yellow-400' : 'text-green-400')}>
            {ARS(d.total_amount!)}{d.payment_status === 'fiado' && ' (Fiado)'}
          </span>
        )}
        {hasPrice && <span className="text-slate-600">·</span>}
        <PaymentStatusBadge
          status={d.payment_status}
          method={d.payment_method}
          discountPct={d.discount_percent}
          amountPaid={d.total_amount}
        />
        <span className="text-slate-600">·</span>
        <span className="text-xs text-slate-500">
          {new Date(d.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
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
    <div className={`${bg} rounded-lg p-4 border border-white/[0.05]`}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Syringe className="w-6 h-6 text-slate-500" />
      </div>
      {hasSearch ? (
        <p className="text-sm text-slate-400">Sin resultados para tu búsqueda.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-300">Sin dispensas registradas</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Las dispensas aparecerán aquí una vez registradas.</p>
          <Link href="/dispensas/nueva">
            <Button className="bg-[#2DC814] hover:bg-[#25a811] text-black font-bold gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Primera dispensa
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
