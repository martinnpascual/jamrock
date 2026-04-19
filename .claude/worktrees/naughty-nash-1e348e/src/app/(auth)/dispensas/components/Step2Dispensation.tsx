'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAllStockLots } from '@/hooks/useMedicalStock'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Leaf, ShoppingCart, AlertTriangle, Tag, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DispensationInput } from '@/hooks/useCheckout'
import type { DispensationConfig } from '@/hooks/useDispensationConfig'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25] as const

interface Step2Props {
  config:                 DispensationConfig | undefined
  initialDispensations?:  DispensationInput[]
  onOnlyDispense:         (inputs: DispensationInput[]) => void
  onAddProducts:          (inputs: DispensationInput[]) => void
}

export function Step2Dispensation({ config, initialDispensations, onOnlyDispense, onAddProducts }: Step2Props) {
  const { data: lots = [], isLoading } = useAllStockLots()

  // Mini-cart: list of genetics already added
  const [addedItems, setAddedItems] = useState<DispensationInput[]>(initialDispensations ?? [])

  // Form state for adding a new entry
  const [lotId, setLotId]                 = useState('')
  const [gramsStr, setGramsStr]           = useState('')
  const [notes, setNotes]                 = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [discountPercent, setDiscount]    = useState<0 | 5 | 10 | 15 | 20 | 25>(0)
  const [applyDiscount, setApplyDiscount] = useState(false)

  const activeLots = useMemo(
    () => lots.filter(l => !l.is_deleted && l.current_grams > 0),
    [lots]
  )

  // Calculate grams already reserved from each lot (from addedItems)
  const reservedByLot = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of addedItems) {
      map[item.lot_id] = (map[item.lot_id] ?? 0) + item.quantity_grams
    }
    return map
  }, [addedItems])

  const selectedLot  = activeLots.find(l => l.id === lotId)
  const availableGrams = selectedLot
    ? selectedLot.current_grams - (reservedByLot[selectedLot.id] ?? 0)
    : 0
  const gramsNum     = parseFloat(gramsStr) || 0
  const pricePerGram = selectedLot?.price_per_gram
    ? selectedLot.price_per_gram
    : (config?.enabled ? config.pricePerGram : 0)
  const subtotal     = pricePerGram * gramsNum
  const activeDiscount = applyDiscount ? discountPercent : 0
  const discountAmount = subtotal * (activeDiscount / 100)
  const totalFinal   = subtotal - discountAmount

  // Reset descuento al deshabilitar
  useEffect(() => { if (!applyDiscount) setDiscount(0) }, [applyDiscount])

  // Si solo hay un lote, pre-seleccionar
  useEffect(() => {
    if (activeLots.length === 1 && !lotId) setLotId(activeLots[0].id)
  }, [activeLots, lotId])

  function validate(): DispensationInput | null {
    setError(null)
    if (!lotId) { setError('Seleccioná un lote'); return null }
    if (!selectedLot) { setError('Lote no encontrado'); return null }
    if (gramsNum <= 0) { setError('Los gramos deben ser mayor a 0'); return null }
    if (gramsNum > availableGrams) {
      setError(`Stock insuficiente. Disponible: ${availableGrams.toFixed(1)}g`)
      return null
    }
    return {
      lot_id:          lotId,
      genetics:        selectedLot.genetics,
      quantity_grams:  gramsNum,
      notes,
      cost:            subtotal,
      discountPercent: activeDiscount,
    }
  }

  function handleAdd() {
    const input = validate()
    if (!input) return
    setAddedItems(prev => [...prev, input])
    // Reset form for next entry
    setLotId('')
    setGramsStr('')
    setNotes('')
    setDiscount(0)
    setApplyDiscount(false)
    setError(null)
  }

  function handleRemove(index: number) {
    setAddedItems(prev => prev.filter((_, i) => i !== index))
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const selectedLotLabel = selectedLot
    ? `${selectedLot.genetics} — ${availableGrams.toFixed(1)}g disponibles${selectedLot.price_per_gram > 0 ? ` · ${formatPrice(selectedLot.price_per_gram)}/g` : ''}`
    : 'Seleccioná lote...'

  const hasItems = addedItems.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Dispensa medicinal</h2>
        <p className="text-sm text-slate-500 mt-0.5">Seleccioná genética y cantidad de gramos</p>
      </div>

      {/* ── Lista de genéticas ya agregadas ── */}
      {hasItems && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Genéticas agregadas</p>
          <div className="space-y-1.5">
            {addedItems.map((item, idx) => {
              const itemDiscount = item.cost * ((item.discountPercent ?? 0) / 100)
              const itemTotal = item.cost - itemDiscount
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{item.genetics}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity_grams}g
                      {item.discountPercent > 0 && ` · ${item.discountPercent}% desc.`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-100 flex-shrink-0">
                    {itemTotal === 0 ? 'Gratis' : ARS(itemTotal)}
                  </p>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="w-6 h-6 rounded hover:bg-red-950/30 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Formulario para agregar genética ── */}
      <div className={cn(
        hasItems && 'border border-white/[0.06] rounded-xl p-4 bg-white/[0.01]'
      )}>
        {hasItems && (
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            + Agregar otra genética
          </p>
        )}

        {/* Lote */}
        <div className="space-y-2">
          <Label className="text-slate-300">Genética / Lote <span className="text-red-400">*</span></Label>
          {isLoading ? (
            <div className="h-11 bg-white/5 rounded-lg animate-pulse" />
          ) : activeLots.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">Sin lotes con stock disponible</p>
            </div>
          ) : (
            <Select value={lotId} onValueChange={v => setLotId(v ?? '')}>
              <SelectTrigger className="h-11 w-full">
                <span className={cn('flex-1 text-left text-sm', lotId ? 'text-slate-100' : 'text-slate-500')}>
                  {selectedLotLabel}
                </span>
              </SelectTrigger>
              <SelectContent>
                {activeLots.map(l => {
                  const avail = l.current_grams - (reservedByLot[l.id] ?? 0)
                  if (avail <= 0) return null
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {l.genetics} — {avail.toFixed(1)}g disponibles{l.price_per_gram > 0 ? ` · ${formatPrice(l.price_per_gram)}/g` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Gramos */}
        <div className="space-y-2 mt-4">
          <Label className="text-slate-300">Cantidad en gramos <span className="text-red-400">*</span></Label>
          <div className="relative">
            <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              min="0.1"
              step="0.5"
              placeholder="ej: 5"
              value={gramsStr}
              onChange={e => setGramsStr(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          {selectedLot && gramsNum > 0 && (
            <p className="text-xs text-slate-500">
              Quedarán {(availableGrams - gramsNum).toFixed(1)}g en el lote
            </p>
          )}
        </div>

        {/* Precio y descuento */}
        {pricePerGram > 0 && gramsNum > 0 && (
          <div className="space-y-3 border border-white/[0.08] rounded-xl p-4 bg-white/[0.02] mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{gramsNum}g × {ARS(pricePerGram)}/g</span>
              <span className="text-slate-200 font-medium">{ARS(subtotal)}</span>
            </div>

            <button
              type="button"
              onClick={() => setApplyDiscount(v => !v)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors rounded-lg px-3 py-1.5 border',
                applyDiscount
                  ? 'text-amber-400 border-amber-800/50 bg-amber-950/20'
                  : 'text-slate-500 border-white/[0.08] hover:text-slate-300 hover:border-white/20'
              )}
            >
              <Tag className="w-3.5 h-3.5" />
              {applyDiscount ? 'Descuento activado' : '+ Aplicar descuento'}
            </button>

            {applyDiscount && (
              <div className="flex flex-wrap gap-2">
                {DISCOUNT_OPTIONS.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscount(pct)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-semibold border transition-all',
                      discountPercent === pct
                        ? 'bg-amber-500 border-amber-500 text-black'
                        : 'border-white/10 text-slate-400 hover:border-amber-500/50 hover:text-amber-400'
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}

            {applyDiscount && discountPercent > 0 && (
              <div className="flex justify-between items-center text-sm text-amber-400">
                <span>Descuento {discountPercent}%</span>
                <span>- {ARS(discountAmount)}</span>
              </div>
            )}

            <div className="border-t border-white/[0.06] pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-300">Total dispensa</span>
              <span className="text-xl font-bold text-[#2DC814]">{ARS(totalFinal)}</span>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="space-y-2 mt-4">
          <Label className="text-slate-300">Notas <span className="text-slate-500 font-normal">(opcional)</span></Label>
          <Textarea
            placeholder="Observaciones sobre la dispensa..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 mt-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Botón agregar genética */}
        <Button
          variant="outline"
          className="w-full h-10 gap-2 text-slate-300 border-white/10 mt-4"
          disabled={activeLots.length === 0}
          onClick={handleAdd}
        >
          <Plus className="w-4 h-4" />
          Agregar genética
        </Button>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2 text-slate-300 border-white/10"
          disabled={!hasItems}
          onClick={() => onOnlyDispense(addedItems)}
        >
          <Leaf className="w-4 h-4" />
          Solo dispensar
        </Button>
        <Button
          className="flex-1 h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold"
          disabled={!hasItems}
          onClick={() => onAddProducts(addedItems)}
        >
          <ShoppingCart className="w-4 h-4" />
          Agregar productos
        </Button>
      </div>
    </div>
  )
}
