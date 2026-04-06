'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockLotSchema, type StockLotFormData } from '@/lib/validations/stock'
import { useAllStockLots, useCreateStockLot, useDeleteStockLot, useLotMovements, type MedicalStockLot } from '@/hooks/useMedicalStock'
import { useRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Package, Plus, Loader2, Leaf, ChevronDown, ChevronUp, Trash2, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StockPage() {
  const { data: lots = [], isLoading, error } = useAllStockLots()
  const { role } = useRole()
  const [showForm, setShowForm] = useState(false)
  const [expandedLot, setExpandedLot] = useState<string | null>(null)

  const canCreate = role === 'gerente' || role === 'cultivador'
  const canDelete = role === 'gerente'

  const totalGrams = lots.reduce((s, l) => s + (l.current_grams > 0 ? l.current_grams : 0), 0)
  const activeLots = lots.filter((l) => l.current_grams > 0).length
  const emptyLots = lots.filter((l) => l.current_grams <= 0).length
  const lowLots = lots.filter((l) => l.current_grams > 0 && l.current_grams < 50).length

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-5xl">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 py-8 text-center">Error al cargar stock.</p>
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stock medicinal</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeLots} lote(s) activo(s) · {totalGrams.toFixed(1)}g disponibles
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10"
          >
            <Plus className="w-4 h-4" />
            Nuevo lote
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Stock total" value={`${totalGrams.toFixed(0)}g`} color="text-[#2DC814]" bg="bg-[#2DC814]/5" />
        <StatCard label="Lotes activos" value={activeLots} color="text-sky-400" bg="bg-sky-900/20" />
        <StatCard label="Stock bajo (<50g)" value={lowLots} color="text-amber-400" bg="bg-amber-900/20" warn={lowLots > 0} />
        <StatCard label="Lotes agotados" value={emptyLots} color="text-slate-500" bg="bg-white/5" />
      </div>

      {lowLots > 0 && (
        <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-400 font-medium">
            ⚠️ {lowLots} lote(s) con menos de 50g — considerá reabastecerte.
          </p>
        </div>
      )}

      {lots.length === 0 ? (
        <EmptyStockState onAdd={() => setShowForm(true)} canCreate={canCreate} />
      ) : (
        <div className="space-y-3">
          {lots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              expanded={expandedLot === lot.id}
              onToggle={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      <NewLotDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}

function LotCard({
  lot,
  expanded,
  onToggle,
  canDelete,
}: {
  lot: MedicalStockLot
  expanded: boolean
  onToggle: () => void
  canDelete: boolean
}) {
  const { data: movements = [], isLoading: loadingMovements } = useLotMovements(expanded ? lot.id : '')
  const deleteMutation = useDeleteStockLot()

  const pct = lot.initial_grams > 0 ? (lot.current_grams / lot.initial_grams) * 100 : 0
  const isEmpty = lot.current_grams <= 0
  const isLow = !isEmpty && lot.current_grams < 50

  const barColor = isEmpty ? 'bg-white/10' : isLow ? 'bg-amber-400' : 'bg-[#2DC814]'

  return (
    <div className={cn('bg-[#111111] border border-white/[0.06] rounded-lg shadow-sm overflow-hidden', isEmpty && 'opacity-50')}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isEmpty ? 'bg-white/5' : 'bg-[#2DC814]/10')}>
              <Leaf className={cn('w-5 h-5', isEmpty ? 'text-slate-500' : 'text-[#2DC814]')} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{lot.genetics}</p>
              <p className="text-xs text-slate-400">
                {new Date(lot.lot_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                {lot.cost_per_gram ? ` · $${lot.cost_per_gram}/g` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-base font-bold text-slate-100">{lot.current_grams.toFixed(1)}g</p>
              <p className="text-xs text-slate-400">de {lot.initial_grams.toFixed(0)}g</p>
            </div>
            {isEmpty ? (
              <Badge variant="outline" className="text-xs text-slate-500 border-white/10 bg-white/5">Agotado</Badge>
            ) : isLow ? (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-800/50 bg-amber-950/40">Stock bajo</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10">Activo</Badge>
            )}
            <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {isEmpty
            ? 'Agotado'
            : `${pct.toFixed(0)}% disponible · ${(lot.initial_grams - lot.current_grams).toFixed(1)}g dispensados`}
        </p>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.05] bg-white/[0.02] p-4 space-y-3">
          {lot.notes && <p className="text-xs text-slate-500 italic">&ldquo;{lot.notes}&rdquo;</p>}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Movimientos
            </p>
            {loadingMovements ? (
              <Skeleton className="h-12 w-full" />
            ) : movements.length === 0 ? (
              <p className="text-xs text-slate-400">Sin movimientos registrados aún.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {movements.map((m: any) => {
                  const member = Array.isArray(m.members) ? m.members[0] : m.members
                  return (
                    <div key={m.dispensation_number} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                      <div>
                        <span className="font-mono text-slate-500">{m.dispensation_number}</span>
                        {member && <span className="text-slate-400 ml-2">{member.first_name} {member.last_name}</span>}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <span className={cn('font-semibold', m.type === 'anulacion' ? 'text-red-400' : 'text-slate-300')}>
                          {m.type === 'anulacion' ? '+' : '-'}{m.quantity_grams}g
                        </span>
                        <span className="text-slate-400 ml-2">
                          {new Date(m.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-900/50 hover:bg-red-950/40 h-8 gap-1.5 text-xs"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(lot.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteMutation.isPending ? 'Eliminando...' : 'Dar de baja lote'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function NewLotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateStockLot()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StockLotFormData>({
    resolver: zodResolver(stockLotSchema),
  })

  async function onSubmit(data: StockLotFormData) {
    try {
      await createMutation.mutateAsync(data)
      reset()
      onClose()
    } catch {
      // error shown below
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo lote de stock medicinal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Genética / Variedad *</Label>
            <Input
              placeholder="Ej: OG Kush, Amnesia Haze..."
              {...register('genetics')}
              className={errors.genetics ? 'border-red-400' : ''}
            />
            {errors.genetics && <p className="text-xs text-red-500">{errors.genetics.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gramos iniciales *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="500"
                {...register('initial_grams')}
                className={errors.initial_grams ? 'border-red-400' : ''}
              />
              {errors.initial_grams && <p className="text-xs text-red-500">{errors.initial_grams.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Costo por gramo ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('cost_per_gram')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha del lote</Label>
            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} {...register('lot_date')} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea placeholder="Origen, cepa, condiciones de almacenamiento..." rows={2} {...register('notes')} />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-500">{(createMutation.error as Error).message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting || createMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                : 'Registrar lote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ label, value, color, bg, warn }: { label: string; value: string | number; color: string; bg: string; warn?: boolean }) {
  return (
    <div className={cn('rounded-lg p-4 border', bg, warn ? 'border-yellow-300' : 'border-transparent')}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </div>
  )
}

function EmptyStockState({ onAdd, canCreate }: { onAdd: () => void; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Package className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">Sin lotes registrados</p>
      <p className="text-xs text-slate-400 mt-1 mb-4">
        Registrá el primer lote para que las dispensas descuenten stock automáticamente.
      </p>
      {canCreate && (
        <Button onClick={onAdd} className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Registrar primer lote
        </Button>
      )}
    </div>
  )
}
