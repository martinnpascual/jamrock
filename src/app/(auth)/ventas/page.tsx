'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, saleSchema, cashRegisterCloseSchema, CATEGORIES, type ProductFormData, type SaleFormData, type CashRegisterCloseData } from '@/lib/validations/sale'
import { useProducts, useCreateProduct, useDeleteProduct, type Product } from '@/hooks/useProducts'
import { useSales, useCreateSale, useDeleteSale } from '@/hooks/useSales'
import { useTodayCashRegister, useOpenCashRegister, useCloseCashRegister } from '@/hooks/useCashRegister'
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
import { ShoppingCart, Package, DollarSign, Plus, Loader2, Trash2, AlertTriangle, CheckCircle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <h2 className="text-lg font-semibold text-slate-800">Ventas y stock comercial</h2>
        <p className="text-sm text-slate-500 mt-0.5">Productos, ventas y cierre de caja diario</p>
      </div>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {tab === 'ventas' && <VentasTab isGerente={isGerente} />}
      {tab === 'productos' && <ProductosTab isGerente={isGerente} />}
      {tab === 'caja' && <CajaTab isGerente={isGerente} />}
    </div>
  )
}

function VentasTab({ isGerente }: { isGerente: boolean }) {
  const { data: sales = [], isLoading } = useSales(100)
  const { data: products = [] } = useProducts()
  const { data: members = [] } = useMembers()
  const createSale = useCreateSale()
  const deleteSale = useDeleteSale()
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const todaySales = sales.filter(s => s.created_at.startsWith(today))
  const totalHoy = todaySales.reduce((s, x) => s + x.total, 0)
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema), defaultValues: { quantity: 1 },
  })
  const pid = watch('product_id')
  const selProd = products.find(p => p.id === pid)
  async function onSubmit(data: SaleFormData) {
    try { await createSale.mutateAsync({ ...data, unit_price: data.unit_price || selProd?.price || 0 }); reset(); setOpen(false) } catch { /**/ }
  }
  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Ventas hoy</p><p className="text-2xl font-bold text-green-600 mt-1">{ARS(totalHoy)}</p></div>
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Transacciones hoy</p><p className="text-2xl font-bold text-blue-600 mt-1">{todaySales.length}</p></div>
        <div className="bg-slate-50 rounded-lg p-4"><p className="text-xs text-slate-500 font-medium">Total registros</p><p className="text-2xl font-bold text-slate-600 mt-1">{sales.length}</p></div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10"><Plus className="w-4 h-4" />Nueva venta</Button>
      </div>
      {sales.length === 0
        ? <div className="flex flex-col items-center py-16"><ShoppingCart className="w-10 h-10 text-slate-300 mb-3" /><p className="text-sm text-slate-500">Sin ventas registradas</p></div>
        : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm divide-y divide-slate-100">
            {sales.map(s => {
              const prod = (Array.isArray(s.commercial_products) ? s.commercial_products[0] : s.commercial_products) as { name: string } | null
              const mem = (Array.isArray(s.members) ? s.members[0] : s.members) as { first_name: string; last_name: string } | null
              return (
                <div key={s.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-slate-50 group">
                  <div><p className="text-sm font-medium text-slate-700">{prod?.name ?? '—'}</p><p className="text-xs text-slate-400">{s.quantity} u. × {ARS(s.unit_price)}</p></div>
                  <p className="text-xs text-slate-500">{mem ? `${mem.first_name} ${mem.last_name}` : '—'}</p>
                  <Badge variant="outline" className="w-fit text-xs capitalize">{s.payment_method ?? '—'}</Badge>
                  <p className="text-sm font-semibold text-green-700">{ARS(s.total)}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</p>
                    {isGerente && <button onClick={() => deleteSale.mutate(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      <Dialog open={open} onOpenChange={o => { if (!o) { reset(); setOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Producto *</Label>
              <Select onValueChange={v => { setValue('product_id', v as string); const p = products.find(x => x.id === v); if (p) setValue('unit_price', p.price) }}>
                <SelectTrigger className={errors.product_id ? 'border-red-400' : ''}><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                <SelectContent>{products.filter(p => p.stock_quantity > 0).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {ARS(p.price)} ({p.stock_quantity} disp.)</SelectItem>)}</SelectContent>
              </Select>
              {errors.product_id && <p className="text-xs text-red-500">{errors.product_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cantidad *</Label><Input type="number" min={1} {...register('quantity')} />{errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}</div>
              <div className="space-y-1.5"><Label>Precio unit. *</Label><Input type="number" step="0.01" {...register('unit_price')} />{errors.unit_price && <p className="text-xs text-red-500">{errors.unit_price.message}</p>}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Socio (opcional)</Label>
              <Select onValueChange={v => setValue('member_id', v === 'none' ? null : v as string)}>
                <SelectTrigger><SelectValue placeholder="Sin socio asociado" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sin socio</SelectItem>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name} · {m.member_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago *</Label>
              <Select onValueChange={v => setValue('payment_method', v as 'efectivo' | 'transferencia' | 'mixto')}>
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
    </div>
  )
}

function ProductosTab({ isGerente }: { isGerente: boolean }) {
  const { data: products = [], isLoading } = useProducts()
  const createProduct = useCreateProduct()
  const deleteProduct = useDeleteProduct()
  const [open, setOpen] = useState(false)
  const low = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length
  const empty = products.filter(p => p.stock_quantity === 0).length
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema), defaultValues: { stock_quantity: 0, low_stock_threshold: 5 },
  })
  async function onSubmit(data: ProductFormData) {
    try { await createProduct.mutateAsync(data); reset(); setOpen(false) } catch { /**/ }
  }
  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-bold text-blue-600 mt-1">{products.length}</p></div>
        <div className="bg-yellow-50 rounded-lg p-4"><p className="text-xs text-slate-500">Stock bajo</p><p className="text-2xl font-bold text-yellow-600 mt-1">{low}</p></div>
        <div className="bg-red-50 rounded-lg p-4"><p className="text-xs text-slate-500">Sin stock</p><p className="text-2xl font-bold text-red-500 mt-1">{empty}</p></div>
      </div>
      {isGerente && <div className="flex justify-end"><Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10"><Plus className="w-4 h-4" />Nuevo producto</Button></div>}
      {products.length === 0
        ? <div className="flex flex-col items-center py-16"><Package className="w-10 h-10 text-slate-300 mb-3" /><p className="text-sm text-slate-500">{isGerente ? 'Cargá el primer producto.' : 'El gerente debe cargar productos.'}</p></div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{products.map(p => <ProductCard key={p.id} product={p} isGerente={isGerente} onDelete={() => deleteProduct.mutate(p.id)} />)}</div>}
      <Dialog open={open} onOpenChange={o => { if (!o) { reset(); setOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input placeholder="Remera Jamrock Club" {...register('name')} className={errors.name ? 'border-red-400' : ''} />{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}</div>
            <div className="space-y-1.5"><Label>Descripción</Label><Input placeholder="Descripción breve..." {...register('description')} /></div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input placeholder="Indumentaria, Accesorios..." list="cats-list" {...register('category')} />
              <datalist id="cats-list">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Precio ($) *</Label><Input type="number" step="0.01" placeholder="0.00" {...register('price')} className={errors.price ? 'border-red-400' : ''} />{errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}</div>
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
    </div>
  )
}

function ProductCard({ product: p, isGerente, onDelete }: { product: Product; isGerente: boolean; onDelete: () => void }) {
  const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  const isEmpty = p.stock_quantity === 0
  return (
    <div className={cn('bg-white border rounded-lg p-4 shadow-sm', isEmpty ? 'border-red-200 opacity-75' : isLow ? 'border-yellow-300' : 'border-slate-200')}>
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>{p.category && <p className="text-xs text-slate-400">{p.category}</p>}</div>
        {isGerente && <button onClick={onDelete} className="text-slate-300 hover:text-red-400 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-lg font-bold text-slate-800">{ARS(p.price)}</p>
        {isEmpty ? <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">Sin stock</Badge>
          : isLow ? <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300 bg-yellow-50"><AlertTriangle className="w-3 h-3 mr-1" />{p.stock_quantity} u.</Badge>
          : <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">{p.stock_quantity} u.</Badge>}
      </div>
    </div>
  )
}

function CajaTab({ isGerente }: { isGerente: boolean }) {
  const { data, isLoading } = useTodayCashRegister()
  const openReg = useOpenCashRegister()
  const closeReg = useCloseCashRegister()
  const [showClose, setShowClose] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CashRegisterCloseData>({ resolver: zodResolver(cashRegisterCloseSchema) })
  async function onClose(d: CashRegisterCloseData) {
    if (!data?.register?.id) return
    try { await closeReg.mutateAsync({ id: data.register.id, actual_total: d.actual_total, notes: d.notes }); reset(); setShowClose(false) } catch { /**/ }
  }
  if (isLoading) return <Skeleton className="h-48 w-full" />
  const reg = data?.register ?? null
  const stats = data?.stats ?? { sales_total: 0, payments_total: 0, expected_total: 0, sales_count: 0, payments_count: 0 }
  const isClosed = reg?.status === 'cerrada'
  return (
    <div className="space-y-5 max-w-2xl">
      <div className={cn('rounded-xl border p-6', reg && !isClosed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', reg && !isClosed ? 'bg-green-200' : 'bg-slate-200')}>
              {isClosed ? <Lock className="w-5 h-5 text-slate-500" /> : <DollarSign className={cn('w-5 h-5', reg ? 'text-green-600' : 'text-slate-500')} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{!reg ? 'Caja no abierta' : isClosed ? 'Caja cerrada' : 'Caja abierta'}</p>
              <p className="text-xs text-slate-500">{data?.today && new Date(data.today + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          {!reg && isGerente && <Button onClick={() => openReg.mutate()} disabled={openReg.isPending} className="bg-green-600 hover:bg-green-700 text-white h-9 gap-1.5">{openReg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Abrir caja</Button>}
          {reg && !isClosed && isGerente && <Button onClick={() => setShowClose(true)} variant="outline" className="h-9 gap-1.5"><Lock className="w-4 h-4" />Cerrar caja</Button>}
          {isClosed && <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 gap-1"><CheckCircle className="w-3.5 h-3.5" />Cerrada</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingresos del día</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Ventas ({stats.sales_count})</span><span className="font-medium">{ARS(stats.sales_total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Pagos socios ({stats.payments_count})</span><span className="font-medium">{ARS(stats.payments_total)}</span></div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between"><span className="text-sm font-semibold text-slate-700">Total esperado</span><span className="text-base font-bold text-green-700">{ARS(stats.expected_total)}</span></div>
          </div>
        </div>
        {isClosed && reg && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado del cierre</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Esperado</span><span className="font-medium">{ARS(reg.expected_total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600">Contado</span><span className="font-medium">{ARS(reg.actual_total ?? 0)}</span></div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold">Diferencia</span>
                <span className={cn('text-base font-bold', (reg.difference ?? 0) === 0 ? 'text-green-700' : (reg.difference ?? 0) > 0 ? 'text-blue-600' : 'text-red-600')}>
                  {(reg.difference ?? 0) >= 0 ? '+' : ''}{ARS(reg.difference ?? 0)}
                </span>
              </div>
              {reg.notes && <p className="text-xs text-slate-400 italic">&ldquo;{reg.notes}&rdquo;</p>}
            </div>
          </div>
        )}
      </div>
      <Dialog open={showClose} onOpenChange={o => { if (!o) { reset(); setShowClose(false) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cerrar caja del día</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onClose)} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Total esperado</p><p className="text-xl font-bold text-slate-800">{ARS(stats.expected_total)}</p></div>
            <div className="space-y-1.5"><Label>Monto contado en caja ($) *</Label><Input type="number" step="0.01" placeholder="0.00" autoFocus {...register('actual_total')} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea placeholder="Observaciones del cierre..." rows={2} {...register('notes')} /></div>
            {closeReg.error && <p className="text-sm text-red-500">{(closeReg.error as Error).message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setShowClose(false) }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || closeReg.isPending} className="bg-slate-800 hover:bg-slate-900 text-white">
                {isSubmitting || closeReg.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cerrando...</> : 'Cerrar caja'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
