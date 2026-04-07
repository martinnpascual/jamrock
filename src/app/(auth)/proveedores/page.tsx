'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supplierSchema, type SupplierFormData } from '@/lib/validations/supplier'
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useSupplierRecords, type Supplier } from '@/hooks/useSuppliers'
import { useRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Truck, Plus, Loader2, Trash2, ChevronDown, ChevronUp, Phone, Mail, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_LABELS = { medicinal: 'Medicinal', comercial: 'Comercial', ambos: 'Ambos' }
const TYPE_COLORS = {
  medicinal: 'bg-[#2DC814]/10 text-[#2DC814] border-[#2DC814]/20',
  comercial: 'bg-sky-900/30 text-sky-400 border-sky-800/50',
  ambos: 'bg-violet-900/30 text-violet-400 border-violet-800/50',
}
const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function ProveedoresPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { role } = useRole()
  const isGerente = role === 'gerente'
  const createSupplier = useCreateSupplier()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  })

  async function onSubmit(data: SupplierFormData) {
    try { await createSupplier.mutateAsync(data); reset(); setOpen(false) } catch { /**/ }
  }

  if (isLoading) return <div className="space-y-3 max-w-4xl">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>

  const medCount = suppliers.filter(s => s.type === 'medicinal' || s.type === 'ambos').length
  const comCount = suppliers.filter(s => s.type === 'comercial' || s.type === 'ambos').length

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proveedores</h2>
          <p className="text-sm text-slate-500 mt-0.5">{suppliers.length} proveedor(es) · {medCount} medicinal · {comCount} comercial</p>
        </div>
        {isGerente && (
          <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />Nuevo proveedor
          </Button>
        )}
      </div>

      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Truck className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Sin proveedores registrados</p>
          {isGerente && <p className="text-xs text-slate-400 mt-1">Agregá proveedores para vincularlos a lotes y suministros.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map(s => (
            <SupplierCard
              key={s.id}
              supplier={s}
              expanded={expanded === s.id}
              onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              isGerente={isGerente}
            />
          ))}
        </div>
      )}

      {/* Modal nuevo proveedor */}
      <Dialog open={open} onOpenChange={o => { if (!o) { reset(); setOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Proveedor SA" {...register('name')} className={errors.name ? 'border-red-400' : ''} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select onValueChange={v => setValue('type', v as 'medicinal' | 'comercial' | 'ambos')}>
                <SelectTrigger className={errors.type ? 'border-red-400' : ''}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicinal">Medicinal</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Contacto</Label><Input placeholder="Juan Pérez" {...register('contact_name')} /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input placeholder="+54 11..." {...register('phone')} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="proveedor@ejemplo.com" {...register('email')} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea rows={2} placeholder="Observaciones..." {...register('notes')} /></div>
            {createSupplier.error && <p className="text-sm text-red-500">{(createSupplier.error as Error).message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false) }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createSupplier.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting || createSupplier.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : 'Crear proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupplierCard({ supplier: s, expanded, onToggle, isGerente }: { supplier: Supplier; expanded: boolean; onToggle: () => void; isGerente: boolean }) {
  const deleteSupplier = useDeleteSupplier()
  const { data: records = [], isLoading } = useSupplierRecords(expanded ? s.id : '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const totalSpend = records.reduce((sum, r) => sum + (r.total_cost ?? 0), 0)

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{s.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {s.contact_name && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{s.contact_name}</span>}
              {s.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
              {s.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className={cn('text-xs border', TYPE_COLORS[s.type])}>{TYPE_LABELS[s.type]}</Badge>
          {isGerente && (
            <button onClick={() => setConfirmDelete(true)} className="text-slate-300 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.05] bg-white/[0.02] p-4 space-y-3">
          {s.notes && <p className="text-xs text-slate-500 italic">&ldquo;{s.notes}&rdquo;</p>}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Historial de suministros {records.length > 0 && `· Total: ${ARS(totalSpend)}`}
            </p>
            {isLoading ? <Skeleton className="h-10 w-full" /> : records.length === 0 ? (
              <p className="text-xs text-slate-500">Sin suministros registrados aún.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {records.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-slate-300 font-medium">{r.description}</p>
                      {r.quantity && <p className="text-slate-500">{r.quantity} unidades</p>}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      {r.total_cost ? <p className="font-semibold text-slate-200">{ARS(r.total_cost)}</p> : null}
                      <p className="text-slate-500">{new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      <Dialog open={confirmDelete} onOpenChange={o => { if (!o && !deleteSupplier.isPending) setConfirmDelete(false) }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-red-400">¿Eliminar proveedor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            ¿Estás seguro de que querés eliminar a <span className="font-semibold text-slate-200">{s.name}</span>? Esta acción se puede revertir.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleteSupplier.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSupplier.isPending}
              onClick={async () => {
                await deleteSupplier.mutateAsync(s.id)
                setConfirmDelete(false)
              }}
            >
              {deleteSupplier.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
