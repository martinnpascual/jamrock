'use client'

import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, saleSchema, type ProductFormData, type SaleFormData } from '@/lib/validations/sale'
import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct, type Product } from '@/hooks/useProducts'
import { useProductCategories, useUpdateProductCategories } from '@/hooks/useProductCategories'
import { useSales, useCreateSale, useDeleteSale } from '@/hooks/useSales'
import { useTodayCashRegister, useOpenCashRegister, useCloseCashRegister, useReopenCashRegister, type CashRegister } from '@/hooks/useCashRegister'
import { useMembers } from '@/hooks/useMembers'
import { useRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MemberCombobox } from '@/components/ui/member-combobox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ShoppingCart, Package, DollarSign, Plus, Loader2, Trash2, AlertTriangle, CheckCircle, Lock, Sun, Moon, RotateCcw, TrendingDown, Receipt, Settings, X, Pencil } from 'lucide-react'
import { useCashExpenses, useCreateExpense, useDeleteExpense, EXPENSE_CATEGORIES, type ExpenseCategory } from '@/hooks/useCashExpenses'
import { cn } from '@/lib/utils'
import { downloadCashRegisterPDF } from '@/components/cash/CashRegisterPDF'

type Tab = 'ventas' | 'productos' | 'caja'
const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function VentasPage() {
  const [tab, setTab] = useState<Tab>('ventas')
  const { role } = useRole()
  const isGerente = role === 'gerente'
  const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'ventas', label: 'Ventas', Icon: ShoppingCart },
    { id: 'productos', label: 'Productos', Icon: Package },
    { id: 'caja', label: 'Caja del día', Icon: DollarSign },
  ]
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ventas y stock comercial</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Productos, ventas y cierre de caja diario</p>
      </div>
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-full sm:w-fit border border-white/[0.06]">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === id ? 'bg-[#151515] text-white shadow-sm border border-white/[0.06]' : 'text-slate-500 hover:text-slate-300')}>
            <Icon className="w-4 h-4" /><span>{label}</span>
          </button>
        ))}
      </div>
      {tab === 'ventas' && <VentasTab isGerente={isGerente} />}
      {tab === 'productos' && <ProductosTab isGerente={isGerente} />}
      {tab === 'caja' && <CajaTab isGerente={isGerente} />}
    </div>
  )
}

type DateRangeFilter = 'hoy' | 'semana' | 'mes'

function VentasTab({ isGerente }: { isGerente: boolean }) {
  const { data: sales = [], isLoading } = useSales(500)
  const { data: products = [] } = useProducts()
  const { data: members = [] } = useMembers()
  const createSale = useCreateSale()
  const deleteSale = useDeleteSale()
  const [open, setOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [confirmDeleteSale, setConfirmDeleteSale] = useState<{ id: string; name: string } | null>(null)
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('hoy')
  const today = new Date().toISOString().split('T')[0]

  const filteredSales = useMemo(() => {
    const now = new Date()
    let cutoff: Date
    if (dateFilter === 'hoy') {
      cutoff = new Date(today + 'T00:00:00')
    } else if (dateFilter === 'semana') {
      cutoff = new Date(now)
      cutoff.setDate(now.getDate() - 7)
    } else {
      cutoff = new Date(now)
      cutoff.setDate(now.getDate() - 30)
    }
    return sales.filter(s => new Date(s.created_at) >= cutoff)
  }, [sales, dateFilter, today])

  const todaySales = sales.filter(s => s.created_at.startsWith(today))
  const totalHoy = todaySales.reduce((s, x) => s + x.total, 0)
  const filteredTotal = filteredSales.reduce((s, x) => s + x.total, 0)
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema), defaultValues: { quantity: 1 },
  })
  const pid = watch('product_id')
  const paymentMethod = watch('payment_method')
  const selProd = products.find(p => p.id === pid)
  async function onSubmit(data: SaleFormData) {
    try {
      await createSale.mutateAsync({ ...data, unit_price: data.unit_price || selProd?.price_basico || 0 })
      reset()
      setSelectedMemberId(null)
      setOpen(false)
    } catch { /* error shown via createSale.error */ }
  }
  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1 bg-[#2DC814]/5 border border-white/[0.06] rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Ventas hoy</p><p className="text-2xl font-bold text-[#2DC814] mt-1">{ARS(totalHoy)}</p></div>
        <div className="bg-sky-900/20 border border-white/[0.06] rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Transacciones hoy</p><p className="text-2xl font-bold text-sky-400 mt-1">{todaySales.length}</p></div>
        <div className="bg-white/5 border border-white/[0.06] rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Total registros</p><p className="text-2xl font-bold text-slate-300 mt-1">{sales.length}</p></div>
      </div>
      {/* Filtro de rango + CTA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/[0.06]">
          {([['hoy', 'Hoy'], ['semana', 'Últimos 7 días'], ['mes', 'Últimos 30 días']] as [DateRangeFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                dateFilter === val
                  ? 'bg-[#151515] text-white shadow-sm border border-white/[0.06]'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {filteredSales.length > 0 && (
            <span className="text-xs text-slate-400">
              {filteredSales.length} ventas · <span className="text-[#2DC814] font-semibold">{ARS(filteredTotal)}</span>
            </span>
          )}
          <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />Nueva venta
          </Button>
        </div>
      </div>
      {sales.length === 0
        ? <div className="flex flex-col items-center py-16"><ShoppingCart className="w-10 h-10 text-slate-300 mb-3" /><p className="text-sm text-slate-500">Sin ventas registradas</p></div>
        : filteredSales.length === 0
        ? <div className="flex flex-col items-center py-12"><ShoppingCart className="w-8 h-8 text-slate-600 mb-2" /><p className="text-sm text-slate-500">Sin ventas en este período</p></div>
        : (
          <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm divide-y divide-white/[0.04]">
            {filteredSales.map(s => {
              const prod = (Array.isArray(s.commercial_products) ? s.commercial_products[0] : s.commercial_products) as { name: string } | null
              const mem = (Array.isArray(s.members) ? s.members[0] : s.members) as { first_name: string; last_name: string } | null
              return (
                <div key={s.id} className="px-4 py-3 hover:bg-white/[0.02] group transition-colors">
                  {/* Mobile layout */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{prod?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.quantity} u. × {ARS(s.unit_price)}
                        {mem && <span className="ml-2 text-slate-600">· {mem.first_name} {mem.last_name}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize border-white/10 text-slate-400">{s.payment_method ?? '—'}</Badge>
                        <span className="text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-bold text-[#2DC814]">{ARS(s.total)}</p>
                      {isGerente && <button onClick={() => setConfirmDeleteSale({ id: s.id, name: prod?.name ?? 'esta venta' })} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      <Dialog open={open} onOpenChange={o => { if (!o) { reset(); setSelectedMemberId(null); setOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Producto *</Label>
              <Select value={pid ?? ''} onValueChange={v => { setValue('product_id', v as string); const p = products.find(x => x.id === v); if (p) setValue('unit_price', p.price_basico) }}>
                <SelectTrigger className={errors.product_id ? 'border-red-400' : ''}><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                <SelectContent>{products.filter(p => p.stock_quantity > 0).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {ARS(p.price_basico)} ({p.stock_quantity} disp.)</SelectItem>)}</SelectContent>
              </Select>
              {errors.product_id && <p className="text-xs text-red-500">{errors.product_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cantidad *</Label><Input type="number" min={1} {...register('quantity')} />{errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}</div>
              <div className="space-y-1.5"><Label>Precio unit. *</Label><Input type="number" step="0.01" {...register('unit_price')} />{errors.unit_price && <p className="text-xs text-red-500">{errors.unit_price.message}</p>}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Socio <span className="text-slate-500 font-normal">(opcional)</span></Label>
              <MemberCombobox
                members={members}
                value={selectedMemberId}
                onChange={id => {
                  setSelectedMemberId(id)
                  setValue('member_id', id)
                }}
                placeholder="Sin socio asociado"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago *</Label>
              <Select value={paymentMethod ?? ''} onValueChange={v => setValue('payment_method', v as 'efectivo' | 'transferencia' | 'mixto')}>
                <SelectTrigger className={errors.payment_method ? 'border-red-400' : ''}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="mixto">Mixto</SelectItem></SelectContent>
              </Select>
              {errors.payment_method && <p className="text-xs text-red-500">{errors.payment_method.message}</p>}
            </div>
            {createSale.error && <p className="text-sm text-red-500">{(createSale.error as Error).message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false) }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createSale.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting || createSale.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : 'Confirmar venta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Confirmación eliminar venta */}
      <Dialog open={!!confirmDeleteSale} onOpenChange={o => { if (!o && !deleteSale.isPending) setConfirmDeleteSale(null) }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader><DialogTitle className="text-red-400">¿Eliminar venta?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">
            ¿Estás seguro de que querés eliminar la venta de <span className="font-semibold text-slate-200">{confirmDeleteSale?.name}</span>? Esta acción se puede revertir.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteSale(null)} disabled={deleteSale.isPending}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteSale.isPending} onClick={async () => {
              if (!confirmDeleteSale) return
              await deleteSale.mutateAsync(confirmDeleteSale.id)
              setConfirmDeleteSale(null)
            }}>
              {deleteSale.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductosTab({ isGerente }: { isGerente: boolean }) {
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [], isLoading: catsLoading } = useProductCategories()
  const updateCategories = useUpdateProductCategories()
  const createProduct = useCreateProduct()
  const deleteProduct = useDeleteProduct()
  const [open, setOpen] = useState(false)
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [confirmDeleteProd, setConfirmDeleteProd] = useState<{ id: string; name: string } | null>(null)
  // Category manager state
  const [editingCategories, setEditingCategories] = useState<string[]>([])
  const [newCatInput, setNewCatInput] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [catError, setCatError] = useState('')

  const low = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length
  const empty = products.filter(p => p.stock_quantity === 0).length
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema), defaultValues: { stock_quantity: 0, low_stock_threshold: 5 },
  })

  function openCatManager() {
    setEditingCategories([...categories])
    setNewCatInput('')
    setEditingIdx(null)
    setEditingValue('')
    setCatError('')
    setCatManagerOpen(true)
  }

  function addCategory() {
    const trimmed = newCatInput.trim()
    if (!trimmed) { setCatError('Ingresá un nombre'); return }
    if (trimmed.length > 50) { setCatError('Máximo 50 caracteres'); return }
    if (editingCategories.includes(trimmed)) { setCatError('Ya existe esa categoría'); return }
    setEditingCategories(prev => [...prev, trimmed])
    setNewCatInput('')
    setCatError('')
  }

  function removeCategory(idx: number) {
    setEditingCategories(prev => prev.filter((_, i) => i !== idx))
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditingValue(editingCategories[idx])
    setCatError('')
  }

  function confirmEdit(idx: number) {
    const trimmed = editingValue.trim()
    if (!trimmed) { setCatError('El nombre no puede estar vacío'); return }
    if (trimmed.length > 50) { setCatError('Máximo 50 caracteres'); return }
    if (editingCategories.some((c, i) => c === trimmed && i !== idx)) { setCatError('Ya existe esa categoría'); return }
    setEditingCategories(prev => prev.map((c, i) => i === idx ? trimmed : c))
    setEditingIdx(null)
    setEditingValue('')
    setCatError('')
  }

  async function saveCategories() {
    setCatError('')
    try {
      await updateCategories.mutateAsync(editingCategories)
      setCatManagerOpen(false)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  async function onSubmit(data: ProductFormData) {
    try {
      await createProduct.mutateAsync(data)
      reset()
      setOpen(false)
    } catch { /* error shown via createProduct.error */ }
  }

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-sky-900/20 border border-white/[0.06] rounded-lg p-3 sm:p-4"><p className="text-xs text-slate-500">Total</p><p className="text-xl sm:text-2xl font-bold text-sky-400 mt-1">{products.length}</p></div>
        <div className="bg-amber-900/20 border border-white/[0.06] rounded-lg p-3 sm:p-4"><p className="text-xs text-slate-500">Stock bajo</p><p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{low}</p></div>
        <div className="bg-red-950/40 border border-white/[0.06] rounded-lg p-3 sm:p-4"><p className="text-xs text-slate-500">Sin stock</p><p className="text-xl sm:text-2xl font-bold text-red-400 mt-1">{empty}</p></div>
      </div>
      {isGerente && (
        <div className="flex justify-end gap-2">
          <Button onClick={openCatManager} variant="outline" className="gap-2 h-10 border-white/10 text-slate-400 hover:text-slate-200">
            <Settings className="w-4 h-4" />Categorías
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />Nuevo producto
          </Button>
        </div>
      )}
      {products.length === 0
        ? <div className="flex flex-col items-center py-16"><Package className="w-10 h-10 text-slate-300 mb-3" /><p className="text-sm text-slate-500">{isGerente ? 'Cargá el primer producto.' : 'El gerente debe cargar productos.'}</p></div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{products.map(p => <ProductCard key={p.id} product={p} isGerente={isGerente} onDelete={() => setConfirmDeleteProd({ id: p.id, name: p.name })} />)}</div>}

      {/* Dialog: Nuevo producto */}
      <Dialog open={open} onOpenChange={o => { if (!o) { reset(); setOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input placeholder="Remera Jamrock Club" {...register('name')} className={errors.name ? 'border-red-400' : ''} />{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}</div>
            <div className="space-y-1.5"><Label>Descripción</Label><Input placeholder="Descripción breve..." {...register('description')} /></div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={catsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={catsLoading ? 'Cargando...' : 'Seleccioná una categoría'} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Precio ($) *</Label><Input type="number" step="0.01" placeholder="0.00" {...register('price_basico')} className={errors.price_basico ? 'border-red-400' : ''} />{errors.price_basico && <p className="text-xs text-red-500">{errors.price_basico.message}</p>}</div>
              <div className="space-y-1.5"><Label>Stock inicial</Label><Input type="number" min={0} {...register('stock_quantity')} /></div>
              <div className="space-y-1.5"><Label>Alerta bajo</Label><Input type="number" min={0} {...register('low_stock_threshold')} /></div>
            </div>
            {createProduct.error && <p className="text-sm text-red-500">{(createProduct.error as Error).message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false) }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || createProduct.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting || createProduct.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : 'Crear producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gestionar categorías */}
      <Dialog open={catManagerOpen} onOpenChange={o => { if (!o && !updateCategories.isPending) setCatManagerOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />Gestionar categorías</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Lista de categorías existentes */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {editingCategories.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-3">Sin categorías</p>
              )}
              {editingCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {editingIdx === idx ? (
                    <>
                      <Input
                        value={editingValue}
                        onChange={e => setEditingValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmEdit(idx) } if (e.key === 'Escape') { setEditingIdx(null); setCatError('') } }}
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => confirmEdit(idx)} className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white">OK</Button>
                      <button onClick={() => { setEditingIdx(null); setCatError('') }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-slate-300 bg-white/[0.03] border border-white/[0.06] rounded px-3 py-1.5 truncate">{cat}</span>
                      <button onClick={() => startEdit(idx)} className="text-slate-500 hover:text-slate-200 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeCategory(idx)} className="text-slate-500 hover:text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {/* Agregar nueva categoría */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría..."
                value={newCatInput}
                onChange={e => { setNewCatInput(e.target.value); setCatError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                className="h-9 text-sm flex-1"
              />
              <Button size="sm" onClick={addCategory} className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white gap-1">
                <Plus className="w-3.5 h-3.5" />Agregar
              </Button>
            </div>
            {catError && <p className="text-xs text-red-500">{catError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatManagerOpen(false)} disabled={updateCategories.isPending}>Cancelar</Button>
            <Button onClick={saveCategories} disabled={updateCategories.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {updateCategories.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar producto */}
      <Dialog open={!!confirmDeleteProd} onOpenChange={o => { if (!o && !deleteProduct.isPending) setConfirmDeleteProd(null) }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader><DialogTitle className="text-red-400">¿Eliminar producto?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">
            ¿Estás seguro de que querés eliminar <span className="font-semibold text-slate-200">{confirmDeleteProd?.name}</span>? Esta acción se puede revertir.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteProd(null)} disabled={deleteProduct.isPending}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteProduct.isPending} onClick={async () => {
              if (!confirmDeleteProd) return
              await deleteProduct.mutateAsync(confirmDeleteProd.id)
              setConfirmDeleteProd(null)
            }}>
              {deleteProduct.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── ShiftRegisterCard — extraído fuera de CajaTab para evitar recreación en cada render ──

interface ShiftRegisterCardProps {
  reg: CashRegister
  shift: string
  isGerente: boolean
  onClose: (shift: 'mañana' | 'tarde') => void
  onReopen: (reg: { id: string; shift: string }) => void
}

function ShiftRegisterCard({ reg, shift, isGerente, onClose, onReopen }: ShiftRegisterCardProps) {
  const isClosed = reg.status === 'cerrada'
  const isOpen = reg.status === 'abierta'
  const ShiftIcon = shift === 'mañana' ? Sun : Moon
  return (
    <div className={cn('bg-[#111111] border rounded-xl p-5 shadow-sm', isOpen ? 'border-[#2DC814]/30' : 'border-white/[0.06]')}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShiftIcon className={cn('w-4 h-4', isOpen ? 'text-[#2DC814]' : 'text-slate-400')} />
          <span className="text-sm font-semibold text-slate-200 capitalize">Turno {shift}</span>
          <Badge variant="outline" className={cn('text-xs', isOpen ? 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10' : 'text-slate-500 border-white/10')}>
            {isOpen ? 'Abierta' : 'Cerrada'}
          </Badge>
        </div>
        {isOpen && isGerente && (
          <Button
            onClick={() => onClose(shift as 'mañana' | 'tarde')}
            className="h-9 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px]"
            size="sm"
          >
            <Lock className="w-3.5 h-3.5" />
            Cerrar caja
          </Button>
        )}
        {isClosed && isGerente && (
          <Button
            onClick={() => onReopen({ id: reg.id, shift })}
            variant="outline"
            className="h-9 gap-1.5 border-amber-600/50 text-amber-400 hover:bg-amber-950/30 font-bold min-h-[44px]"
            size="sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reabrir
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Esperado (efectivo)</span>
          <span className="font-semibold text-slate-200">{ARS(Number(reg.expected_total))}</span>
        </div>
        {isClosed && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Contado</span>
              <span className="font-medium text-slate-200">{ARS(reg.actual_total ?? 0)}</span>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-300">Diferencia</span>
              <span className={cn('text-sm font-bold', (reg.difference ?? 0) === 0 ? 'text-[#2DC814]' : (reg.difference ?? 0) > 0 ? 'text-sky-400' : 'text-red-400')}>
                {(reg.difference ?? 0) >= 0 ? '+' : ''}{ARS(reg.difference ?? 0)}
              </span>
            </div>
            {reg.closed_at && (
              <p className="text-xs text-slate-500">Cerrada: {new Date(reg.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
            )}
            {reg.notes && <p className="text-xs text-slate-400 italic">&ldquo;{reg.notes}&rdquo;</p>}
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product: p, isGerente, onDelete }: { product: Product; isGerente: boolean; onDelete: () => void }) {
  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  const isEmpty = p.stock_quantity === 0
  return (
    <div className={cn('bg-[#111111] border rounded-lg p-4 shadow-sm', isEmpty ? 'border-red-900/50 opacity-60' : isLow ? 'border-amber-800/50' : 'border-white/[0.06]')}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>{p.category && <p className="text-xs text-slate-500">{p.category}</p>}</div>
        {isGerente && <button onClick={onDelete} className="text-slate-300 hover:text-red-400 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-lg font-bold text-slate-100">{ARS(p.price_basico)}</p>
        {isEmpty ? <Badge variant="outline" className="text-xs text-red-400 border-red-900/50 bg-red-950/40">Sin stock</Badge>
          : isLow ? <Badge variant="outline" className="text-xs text-amber-400 border-amber-800/50 bg-amber-950/40"><AlertTriangle className="w-3 h-3 mr-1" />{p.stock_quantity} u.</Badge>
          : <Badge variant="outline" className="text-xs text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10">{p.stock_quantity} u.</Badge>}
      </div>
    </div>
  )
}

function CajaTab({ isGerente }: { isGerente: boolean }) {
  const { data, isLoading } = useTodayCashRegister()
  const openReg = useOpenCashRegister()
  const closeReg = useCloseCashRegister()
  const reopenReg = useReopenCashRegister()

  // Egresos
  const { data: expensesData } = useCashExpenses()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('otro')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState<number>(0)
  const [expenseNotes, setExpenseNotes] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<{ id: string; desc: string } | null>(null)

  async function onCreateExpense() {
    setExpenseError('')
    if (!expenseDescription.trim()) { setExpenseError('Ingresá una descripción'); return }
    if (expenseAmount <= 0) { setExpenseError('El monto debe ser mayor a 0'); return }
    try {
      await createExpense.mutateAsync({
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: expenseAmount,
        notes: expenseNotes.trim() || undefined,
      })
      setExpenseDescription('')
      setExpenseAmount(0)
      setExpenseNotes('')
      setExpenseCategory('otro')
      setShowExpenseForm(false)
    } catch (err) {
      setExpenseError(err instanceof Error ? err.message : 'Error al registrar egreso')
    }
  }

  // Shift selection for opening
  const autoShift = new Date().getHours() < 14 ? 'mañana' : 'tarde'
  const [selectedShift, setSelectedShift] = useState<'mañana' | 'tarde'>(autoShift)

  // Open confirmation dialog
  const [showOpenConfirm, setShowOpenConfirm] = useState(false)

  // Reopen confirmation dialog
  const [reopeningReg, setReopeningReg] = useState<{ id: string; shift: string } | null>(null)

  // Close dialog state
  const [closingShift, setClosingShift] = useState<'mañana' | 'tarde' | null>(null)
  const [closeActualTotal, setCloseActualTotal] = useState<number>(0)
  const [closeNotes, setCloseNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState('')

  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function onOpen() {
    try {
      await openReg.mutateAsync(selectedShift)
      setShowOpenConfirm(false)
      showToast(`Caja turno ${selectedShift} abierta correctamente`)
    } catch (err) {
      console.error('Error al abrir caja:', err)
    }
  }

  async function onReopen() {
    if (!reopeningReg) return
    try {
      await reopenReg.mutateAsync(reopeningReg.id)
      showToast(`Caja turno ${reopeningReg.shift} reabierta correctamente`)
      setReopeningReg(null)
    } catch (err) {
      console.error('Error al reabrir caja:', err)
    }
  }

  async function onClose() {
    if (!closingShift) return
    const reg = closingShift === 'mañana' ? summary.morning : summary.afternoon
    if (!reg) { setCloseError('No se encontró la caja del turno'); return }
    setClosing(true)
    setCloseError('')
    try {
      await closeReg.mutateAsync({ id: reg.id, actual_total: closeActualTotal, notes: closeNotes || undefined })
      const diff = closeActualTotal - Number(reg.expected_total)
      const diffMsg = diff === 0 ? 'Cuadra perfecto' : diff > 0 ? `Sobrante: +${ARS(diff)}` : `Faltante: ${ARS(diff)}`
      const closedShift = closingShift
      setClosingShift(null)
      setCloseActualTotal(0)
      setCloseNotes('')
      showToast(`Caja turno ${closedShift} cerrada. ${diffMsg} — Generando PDF...`)
      // Descargar PDF de cierre
      try {
        await downloadCashRegisterPDF({
          shift: closedShift,
          date: data?.today ?? new Date().toISOString().split('T')[0],
          expectedTotal: Number(reg.expected_total),
          actualTotal: closeActualTotal,
          difference: diff,
          notes: closeNotes || undefined,
          salesTotal: stats.sales_total,
          paymentsTotal: stats.payments_total,
        })
      } catch {
        // PDF failure is non-critical — no interrumpir el flujo
      }
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Error al cerrar la caja')
    } finally {
      setClosing(false)
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const stats = data?.stats ?? { sales_total: 0, payments_total: 0, expected_total: 0, sales_count: 0, payments_count: 0 }
  const summary = data?.summary ?? { has_open: false, open_shift: null, morning: null, afternoon: null, total_expected: 0, total_actual: null, total_difference: null }
  const todayFormatted = data?.today ? new Date(data.today + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const todayShort = data?.today ? new Date(data.today + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

  const bothClosed = summary.morning?.status === 'cerrada' && summary.afternoon?.status === 'cerrada'
  const hasAnyRegister = !!summary.morning || !!summary.afternoon
  const canOpenMorning = !summary.morning
  const canOpenAfternoon = !summary.afternoon

  // Determine which shift to show for opening
  const availableShifts = [
    ...(canOpenMorning ? ['mañana' as const] : []),
    ...(canOpenAfternoon ? ['tarde' as const] : []),
  ]

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header con fecha */}
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', summary.has_open ? 'bg-[#2DC814]/20' : 'bg-white/10')}>
          <DollarSign className={cn('w-5 h-5', summary.has_open ? 'text-[#2DC814]' : 'text-slate-400')} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Caja del día</p>
          <p className="text-xs text-slate-500 capitalize">{todayFormatted}</p>
        </div>
      </div>

      {/* Estado: No hay caja abierta y hay turnos disponibles */}
      {!hasAnyRegister && (
        <div className="bg-white/5 border border-white/[0.06] rounded-xl p-6 text-center space-y-4">
          <DollarSign className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-400">No hay caja abierta para hoy</p>

          {/* Selector de turno */}
          <div className="flex justify-center gap-2">
            {(['mañana', 'tarde'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSelectedShift(s)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all min-h-[44px]',
                  selectedShift === s
                    ? 'bg-[#2DC814]/10 border-[#2DC814]/50 text-[#2DC814]'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                )}
              >
                {s === 'mañana' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Turno {s === 'mañana' ? 'Mañana' : 'Tarde'}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setShowOpenConfirm(true)}
            disabled={openReg.isPending}
            className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 gap-2 min-h-[44px]"
          >
            {openReg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Abrir caja — Turno {selectedShift === 'mañana' ? 'Mañana' : 'Tarde'}
          </Button>
        </div>
      )}

      {/* Si hay registro(s), mostrar cards por turno */}
      {hasAnyRegister && (
        <div className="space-y-4">
          {summary.morning && (
            <ShiftRegisterCard
              reg={summary.morning}
              shift="mañana"
              isGerente={isGerente}
              onClose={(s) => { setClosingShift(s); setCloseActualTotal(0); setCloseNotes(''); setCloseError('') }}
              onReopen={setReopeningReg}
            />
          )}
          {summary.afternoon && (
            <ShiftRegisterCard
              reg={summary.afternoon}
              shift="tarde"
              isGerente={isGerente}
              onClose={(s) => { setClosingShift(s); setCloseActualTotal(0); setCloseNotes(''); setCloseError('') }}
              onReopen={setReopeningReg}
            />
          )}

          {/* Botón para abrir el turno pendiente (si falta uno) */}
          {availableShifts.length > 0 && !bothClosed && (
            <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 text-center space-y-3">
              {availableShifts.map(s => (
                <Button
                  key={s}
                  onClick={() => { setSelectedShift(s); setShowOpenConfirm(true) }}
                  disabled={openReg.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 gap-2 min-h-[44px]"
                >
                  {openReg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Abrir caja — Turno {s === 'mañana' ? 'Mañana' : 'Tarde'}
                </Button>
              ))}
            </div>
          )}

          {/* Resumen del día (si ambas cerradas) */}
          {bothClosed && summary.morning && summary.afternoon && (
            <div className="bg-[#111111] border border-[#2DC814]/20 rounded-xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-[#2DC814] uppercase tracking-wide">Total del día</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Esperado total</span>
                  <span className="font-medium text-slate-200">{ARS(summary.total_expected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Contado total</span>
                  <span className="font-medium text-slate-200">{ARS(summary.total_actual ?? 0)}</span>
                </div>
                <div className="h-px bg-white/[0.05]" />
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-slate-200">Diferencia total</span>
                  <span className={cn('text-base font-bold',
                    (summary.total_difference ?? 0) === 0 ? 'text-[#2DC814]'
                    : (summary.total_difference ?? 0) > 0 ? 'text-sky-400'
                    : 'text-red-400'
                  )}>
                    {(summary.total_difference ?? 0) >= 0 ? '+' : ''}{ARS(summary.total_difference ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingresos del día */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-lg p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingresos del día</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-slate-400">Ventas ({stats.sales_count})</span><span className="font-medium text-slate-200">{ARS(stats.sales_total)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">Pagos socios ({stats.payments_count})</span><span className="font-medium text-slate-200">{ARS(stats.payments_total)}</span></div>
          <div className="h-px bg-white/[0.05]" />
          <div className="flex justify-between"><span className="text-sm font-semibold text-slate-300">Total esperado</span><span className="text-base font-bold text-[#2DC814]">{ARS(stats.expected_total)}</span></div>
        </div>
      </div>

      {/* AlertDialog: Confirmar apertura */}
      <AlertDialog open={showOpenConfirm} onOpenChange={setShowOpenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abrir caja</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés abrir la caja del turno <strong className="text-slate-200">{selectedShift.toUpperCase()}</strong> del día <strong className="text-slate-200">{todayShort}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={openReg.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onOpen}
              disabled={openReg.isPending}
              className="bg-green-600 hover:bg-green-700 text-white font-bold min-h-[44px]"
            >
              {openReg.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Abriendo...</> : 'Sí, abrir caja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmar reapertura */}
      <AlertDialog open={!!reopeningReg} onOpenChange={o => { if (!o) setReopeningReg(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir caja</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés reabrir la caja del turno <strong className="text-slate-200">{reopeningReg?.shift?.toUpperCase()}</strong>? Se borrarán los datos del cierre anterior (monto contado, diferencia y notas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopenReg.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onReopen}
              disabled={reopenReg.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold min-h-[44px]"
            >
              {reopenReg.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reabriendo...</> : 'Sí, reabrir caja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Cerrar caja con monto contado */}
      <Dialog open={!!closingShift} onOpenChange={o => { if (!o && !closing) { setClosingShift(null); setCloseError('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Cerrar caja — Turno {closingShift === 'mañana' ? 'Mañana' : 'Tarde'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              ¿Seguro que querés cerrar la caja del turno <strong className="text-slate-200">{closingShift?.toUpperCase()}</strong> del día <strong className="text-slate-200">{todayShort}</strong>?
            </p>
            <div className="bg-white/5 border border-white/[0.06] rounded-lg p-3">
              <p className="text-xs text-slate-500">Esperado en caja</p>
              <p className="text-2xl font-bold text-slate-100">
                {ARS(Number(closingShift === 'mañana' ? summary.morning?.expected_total : summary.afternoon?.expected_total) ?? 0)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Monto contado en caja ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                autoFocus
                value={closeActualTotal || ''}
                onChange={e => setCloseActualTotal(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas <span className="text-slate-500 font-normal">(opcional)</span></Label>
              <Textarea placeholder="Observaciones del cierre..." rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
            </div>
            {closeError && (
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{closeError}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setClosingShift(null); setCloseError('') }} disabled={closing}>
                Cancelar
              </Button>
              <Button onClick={onClose} disabled={closing} className="bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px]">
                {closing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cerrando...</> : 'Sí, cerrar caja'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Egresos del día ─────────────────────────────────────── */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Egresos del día</p>
            {(expensesData?.expenses?.length ?? 0) > 0 && (
              <span className="text-xs text-red-400 font-bold">{ARS(expensesData?.total ?? 0)}</span>
            )}
          </div>
          {isGerente && (
            <Button
              size="sm"
              onClick={() => setShowExpenseForm(true)}
              className="h-8 gap-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-900/40 font-medium min-h-[44px] text-xs"
              variant="outline"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo egreso
            </Button>
          )}
        </div>

        {(expensesData?.expenses?.length ?? 0) === 0 ? (
          <p className="text-xs text-slate-600 text-center py-2">Sin egresos registrados hoy</p>
        ) : (
          <div className="space-y-1.5">
            {expensesData!.expenses.map(exp => {
              const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category)
              return (
                <div key={exp.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] group">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-300 truncate">{exp.description}</p>
                    <p className="text-xs text-slate-600">{cat?.label ?? exp.category} · {new Date(exp.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-red-400">−{ARS(exp.amount)}</span>
                    {isGerente && (
                      <button
                        onClick={() => setConfirmDeleteExpense({ id: exp.id, desc: exp.description })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between pt-1 border-t border-white/[0.05]">
              <span className="text-xs text-slate-500">Total egresos</span>
              <span className="text-sm font-bold text-red-400">−{ARS(expensesData?.total ?? 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Nuevo egreso */}
      <Dialog open={showExpenseForm} onOpenChange={o => { if (!o) { setExpenseError(''); setShowExpenseForm(false) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="w-4 h-4 text-red-400" />Registrar egreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={expenseCategory} onValueChange={v => setExpenseCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción *</Label>
              <Input
                placeholder="Ej: Sueldo Juan, Factura luz mayo..."
                value={expenseDescription}
                onChange={e => setExpenseDescription(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto ($) *</Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="0"
                value={expenseAmount || ''}
                onChange={e => setExpenseAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas <span className="text-slate-500 font-normal">(opcional)</span></Label>
              <Textarea
                placeholder="Observaciones adicionales..."
                rows={2}
                value={expenseNotes}
                onChange={e => setExpenseNotes(e.target.value)}
              />
            </div>
            {expenseError && (
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{expenseError}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)} disabled={createExpense.isPending}>Cancelar</Button>
              <Button
                onClick={onCreateExpense}
                disabled={createExpense.isPending}
                className="bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px]"
              >
                {createExpense.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : 'Registrar egreso'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar eliminar egreso */}
      <AlertDialog open={!!confirmDeleteExpense} onOpenChange={o => { if (!o) setConfirmDeleteExpense(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar egreso?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que querés eliminar el egreso &ldquo;<strong className="text-slate-200">{confirmDeleteExpense?.desc}</strong>&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpense.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteExpense) return
                await deleteExpense.mutateAsync(confirmDeleteExpense.id)
                setConfirmDeleteExpense(null)
              }}
              disabled={deleteExpense.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deleteExpense.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {openReg.error && (
        <p className="text-sm text-red-400 text-center">{(openReg.error as Error).message}</p>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-[#1a1a1a] border border-[#2DC814]/30 rounded-xl shadow-2xl px-5 py-3 z-50 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[#2DC814]" />
          <p className="text-sm font-semibold text-slate-100">{toast}</p>
        </div>
      )}
    </div>
  )
}
