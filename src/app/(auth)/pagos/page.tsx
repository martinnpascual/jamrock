'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormData, CONCEPTS } from '@/lib/validations/payment'
import { usePayments, useCreatePayment, useDeletePayment, type Payment } from '@/hooks/usePayments'
import { useMembers } from '@/hooks/useMembers'
import { useRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { Search, Plus, Loader2, DollarSign, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
}

const METHOD_COLORS: Record<string, string> = {
  efectivo: 'bg-[#2DC814]/10 text-[#2DC814] border-[#2DC814]/20',
  transferencia: 'bg-sky-900/30 text-sky-400 border-sky-800/50',
  mixto: 'bg-violet-900/30 text-violet-400 border-violet-800/50',
}

export default function PagosPage() {
  const { data: payments = [], isLoading, error } = usePayments(200)
  const { role } = useRole()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; amount: number } | null>(null)

  const canCreate = role === 'gerente' || role === 'secretaria'
  const canDelete = role === 'gerente'

  const filtered = useMemo(() => {
    if (!search) return payments
    const q = search.toLowerCase()
    return payments.filter((p) => {
      const memberName = p.members
        ? `${p.members.first_name} ${p.members.last_name}`.toLowerCase()
        : ''
      return memberName.includes(q) || p.concept.toLowerCase().includes(q) || p.members?.member_number.toLowerCase().includes(q)
    })
  }, [payments, search])

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const totalHoy = payments
    .filter((p) => p.created_at.startsWith(today))
    .reduce((s, p) => s + p.amount, 0)
  const totalMes = payments
    .filter((p) => p.created_at.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, p) => s + p.amount, 0)

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-5xl">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 py-8 text-center">Error al cargar pagos.</p>
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cuentas corrientes y pagos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{payments.length} registro(s) · últimos 200</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />
            Registrar pago
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Cobrado hoy" value={formatARS(totalHoy)} color="text-[#2DC814]" bg="bg-[#2DC814]/5" />
        <StatCard label="Cobrado este mes" value={formatARS(totalMes)} color="text-sky-400" bg="bg-sky-900/20" />
        <StatCard label="Total registros" value={payments.length} color="text-slate-300" bg="bg-white/5" />
      </div>

      {/* Filtro */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por socio, concepto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} onAdd={() => setShowForm(true)} canCreate={canCreate} />
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05] text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Socio</span>
            <span>Concepto</span>
            <span>Método</span>
            <span>Monto</span>
            <span>Fecha</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((p) => (
              <PaymentRow key={p.id} payment={p} canDelete={canDelete} onDelete={() => setDeleteConfirm({ id: p.id, amount: p.amount })} />
            ))}
          </div>
        </div>
      )}

      {/* Modal nuevo pago */}
      <NewPaymentDialog open={showForm} onClose={() => setShowForm(false)} />

      {/* Modal confirmar anulación */}
      <ConfirmDeleteDialog
        item={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  )
}

function PaymentRow({ payment: p, canDelete, onDelete }: { payment: Payment; canDelete: boolean; onDelete: () => void }) {
  const member = Array.isArray(p.members) ? (p.members as unknown[])[0] as typeof p.members : p.members

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 lg:gap-4 px-4 py-3 items-center hover:bg-white/[0.03] group transition-colors">
      <div className="flex items-center gap-2.5">
        {member ? (
          <>
            <div className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center text-xs font-semibold text-slate-400 flex-shrink-0 border border-white/[0.06]">
              {member.first_name.charAt(0)}{member.last_name.charAt(0)}
            </div>
            <div>
              <Link href={`/socios/${p.member_id}`} className="text-sm font-medium text-slate-200 hover:text-[#2DC814] transition-colors">
                {member.first_name} {member.last_name}
              </Link>
              <p className="text-xs text-slate-400">{member.member_number}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-400 italic">—</span>
        )}
      </div>

      <div>
        <span className="text-sm text-slate-400 capitalize">{p.concept.replace('_', ' ')}</span>
        {p.notes && p.concept === 'dispensa' && (
          <p className="text-xs text-slate-500 truncate max-w-[200px]" title={p.notes}>{p.notes}</p>
        )}
      </div>

      <div>
        {p.payment_method && (
          <Badge variant="outline" className={cn('text-xs border', METHOD_COLORS[p.payment_method] ?? 'bg-slate-50 text-slate-600')}>
            {METHOD_LABELS[p.payment_method] ?? p.payment_method}
          </Badge>
        )}
      </div>

      <span className="text-sm font-semibold text-[#2DC814]">{formatARS(p.amount)}</span>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {canDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function NewPaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: members = [] } = useMembers()
  const createMutation = useCreatePayment()
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  })

  async function onSubmit(data: PaymentFormData) {
    try {
      await createMutation.mutateAsync(data)
      reset()
      onClose()
    } catch {
      // shown below
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Socio */}
          <div className="space-y-1.5">
            <Label>Socio *</Label>
            <MemberCombobox
              members={members}
              value={watch('member_id') || null}
              onChange={(id) => setValue('member_id', id ?? '')}
              placeholder="Buscar socio..."
            />
            {errors.member_id && <p className="text-xs text-red-500">{errors.member_id.message}</p>}
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label>Concepto *</Label>
            <Select onValueChange={(v) => setValue('concept', v as string)}>
              <SelectTrigger className={errors.concept ? 'border-red-400' : ''}>
                <SelectValue placeholder="Seleccionar concepto..." />
              </SelectTrigger>
              <SelectContent>
                {CONCEPTS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.concept && <p className="text-xs text-red-500">{errors.concept.message}</p>}
          </div>

          {/* Monto + método */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto ($) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
                className={errors.amount ? 'border-red-400' : ''}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Método *</Label>
              <Select onValueChange={(v) => setValue('payment_method', v as 'efectivo' | 'transferencia' | 'mixto')}>
                <SelectTrigger className={errors.payment_method ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Método..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea placeholder="Observaciones opcionales..." rows={2} {...register('notes')} />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-500">{(createMutation.error as Error).message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting || createMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDeleteDialog({
  item,
  onClose,
}: {
  item: { id: string; amount: number } | null
  onClose: () => void
}) {
  const deleteMutation = useDeletePayment()

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular pago</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          ¿Confirmás la anulación del pago de <strong>{item ? formatARS(item.amount) : ''}</strong>? Esta acción es reversible solo manualmente.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!item) return
              await deleteMutation.mutateAsync(item.id)
              onClose()
            }}
          >
            {deleteMutation.isPending ? 'Anulando...' : 'Anular pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-lg p-4 border border-white/[0.06]', bg)}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </div>
  )
}

function EmptyState({ hasSearch, onAdd, canCreate }: { hasSearch: boolean; onAdd: () => void; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <DollarSign className="w-6 h-6 text-slate-500" />
      </div>
      {hasSearch ? (
        <p className="text-sm text-slate-500">Sin resultados para tu búsqueda.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-300">Sin pagos registrados</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Los pagos de socios aparecerán aquí.</p>
          {canCreate && (
            <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Primer pago
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}
