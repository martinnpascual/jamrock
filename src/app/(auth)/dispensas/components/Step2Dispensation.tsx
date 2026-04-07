'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAllStockLots } from '@/hooks/useMedicalStock'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Leaf, ShoppingCart, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DispensationInput } from '@/hooks/useCheckout'
import type { DispensationConfig } from '@/hooks/useDispensationConfig'

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Step2Props {
  config:          DispensationConfig | undefined
  onOnlyDispense:  (input: DispensationInput) => void   // salta a step 4
  onAddProducts:   (input: DispensationInput) => void   // va a step 3
}

export function Step2Dispensation({ config, onOnlyDispense, onAddProducts }: Step2Props) {
  const { data: lots = [], isLoading } = useAllStockLots()
  const [lotId, setLotId]               = useState('')
  const [gramsStr, setGramsStr]         = useState('')
  const [notes, setNotes]               = useState('')
  const [error, setError]               = useState<string | null>(null)

  const activeLots = useMemo(
    () => lots.filter(l => !l.is_deleted && l.current_grams > 0),
    [lots]
  )

  const selectedLot = activeLots.find(l => l.id === lotId)
  const gramsNum    = parseFloat(gramsStr) || 0
  const pricePerGram = config?.enabled ? config.pricePerGram : 0
  const dispensaCost = pricePerGram * gramsNum

  // Si solo hay un lote, pre-seleccionar
  useEffect(() => {
    if (activeLots.length === 1 && !lotId) {
      setLotId(activeLots[0].id)
    }
  }, [activeLots, lotId])

  function validate(): DispensationInput | null {
    setError(null)
    if (!lotId) { setError('Seleccioná un lote'); return null }
    if (!selectedLot) { setError('Lote no encontrado'); return null }
    if (gramsNum <= 0) { setError('Los gramos deben ser mayor a 0'); return null }
    if (gramsNum > selectedLot.current_grams) {
      setError(`Stock insuficiente. Disponible: ${selectedLot.current_grams}g`)
      return null
    }
    return {
      lot_id:         lotId,
      genetics:       selectedLot.genetics,
      quantity_grams: gramsNum,
      notes,
      cost:           dispensaCost,
    }
  }

  const selectedLotLabel = selectedLot
    ? `${selectedLot.genetics} — ${selectedLot.current_grams}g disponibles`
    : 'Seleccioná lote...'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Dispensa medicinal</h2>
        <p className="text-sm text-slate-500 mt-0.5">Seleccioná genética y cantidad de gramos</p>
      </div>

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
              {activeLots.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.genetics} — {l.current_grams}g disponibles
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Gramos */}
      <div className="space-y-2">
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
            Quedarán {(selectedLot.current_grams - gramsNum).toFixed(1)}g en el lote
          </p>
        )}
      </div>

      {/* Costo de dispensa (si está habilitado) */}
      {config?.enabled && gramsNum > 0 && (
        <div className="bg-[#2DC814]/5 border border-[#2DC814]/20 rounded-lg p-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400">Costo de dispensa</p>
            <p className="text-xs text-slate-500 mt-0.5">{gramsNum}g × {ARS(pricePerGram)}/g</p>
          </div>
          <p className="text-lg font-bold text-[#2DC814]">{ARS(dispensaCost)}</p>
        </div>
      )}

      {/* Notas */}
      <div className="space-y-2">
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
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2 text-slate-300 border-white/10"
          disabled={activeLots.length === 0}
          onClick={() => {
            const input = validate()
            if (input) onOnlyDispense(input)
          }}
        >
          <Leaf className="w-4 h-4" />
          Solo dispensar
        </Button>
        <Button
          className="flex-1 h-12 gap-2 bg-[#2DC814] hover:bg-[#25a811] text-black font-bold"
          disabled={activeLots.length === 0}
          onClick={() => {
            const input = validate()
            if (input) onAddProducts(input)
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          Agregar productos
        </Button>
      </div>
    </div>
  )
}
