'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useMedicalStockLots } from '@/hooks/useMedicalStock'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Syringe,
  User,
  QrCode,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReprocannStatus } from '@/types/database'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MemberVerification {
  found: boolean
  member?: {
    id: string
    member_number: string
    first_name: string
    last_name: string
    dni: string
    reprocann_status: ReprocannStatus
    reprocann_expiry: string | null
    qr_code: string | null
  }
  verification?: {
    allowed: boolean
    reason: string | null
  }
  month_stats?: {
    total_grams: number
    dispensation_count: number
  }
}

type Step = 'search' | 'verify' | 'confirm' | 'done'

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function DispensationFlow() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: lots } = useMedicalStockLots()

  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'qr' | 'text'>('qr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verification, setVerification] = useState<MemberVerification | null>(null)

  // Formulario de dispensa
  const [quantityGrams, setQuantityGrams] = useState('')
  const [genetics, setGenetics] = useState('')
  const [lotId, setLotId] = useState<string>('none')
  const [notes, setNotes] = useState('')

  // Resultado final
  const [dispensationNumber, setDispensationNumber] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: Buscar socio ──────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)

    try {
      const param = searchMode === 'qr'
        ? `qr=${encodeURIComponent(searchQuery.trim())}`
        : `dni=${encodeURIComponent(searchQuery.trim())}`

      const res = await fetch(`/api/members/verify?${param}`)
      const data: MemberVerification = await res.json()

      if (!data.found || !data.member) {
        setError('Socio no encontrado. Verificá el QR o DNI.')
        setLoading(false)
        return
      }

      setVerification(data)
      setStep('verify')

      // Pre-llenar genética desde el lote más reciente
      if (lots && lots.length > 0) {
        setGenetics(lots[0].genetics)
        setLotId(lots[0].id)
      }
    } catch {
      setError('Error de conexión. Reintentá.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, searchMode, lots])

  // Enter en el campo de búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Step 2: Verificación → Paso 3 ────────
  const handleProceed = () => {
    if (!verification?.verification?.allowed) return
    setStep('confirm')
  }

  // ── Step 3: Confirmar y registrar ─────────
  const handleSubmit = async () => {
    if (!verification?.member) return
    if (!quantityGrams || !genetics) {
      setError('Completá cantidad y genética.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/dispensations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: verification.member.id,
          quantity_grams: parseFloat(quantityGrams),
          genetics,
          lot_id: lotId === 'none' ? null : lotId,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar la dispensa.')
        setLoading(false)
        return
      }

      setDispensationNumber(data.dispensation?.dispensation_number ?? null)
      setStep('done')
      queryClient.invalidateQueries({ queryKey: ['dispensations'] })
    } catch {
      setError('Error de conexión. Reintentá.')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset ──────────────────────────────────
  const handleReset = () => {
    setStep('search')
    setSearchQuery('')
    setVerification(null)
    setQuantityGrams('')
    setGenetics('')
    setLotId('none')
    setNotes('')
    setError(null)
    setDispensationNumber(null)
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Indicador de pasos */}
      <StepIndicator step={step} />

      {/* ── STEP: search ── */}
      {step === 'search' && (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6 pb-6 space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Identificar socio</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Escaneá el QR del carnet o ingresá el DNI
              </p>
            </div>

            {/* Toggle QR/DNI */}
            <div className="flex rounded-lg border border-slate-200 p-1 gap-1">
              <button
                onClick={() => { setSearchMode('qr'); setSearchQuery('') }}
                className={cn(
                  'flex-1 py-1.5 text-sm rounded-md font-medium transition-colors',
                  searchMode === 'qr'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                QR / Número socio
              </button>
              <button
                onClick={() => { setSearchMode('text'); setSearchQuery('') }}
                className={cn(
                  'flex-1 py-1.5 text-sm rounded-md font-medium transition-colors',
                  searchMode === 'text'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                DNI
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  autoFocus
                  placeholder={searchMode === 'qr' ? 'Escaneá QR o escribí SOC-0001' : 'Ingresá el DNI'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 h-12 text-base"
                  inputMode={searchMode === 'text' ? 'numeric' : 'text'}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || loading}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Buscando...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" />Buscar socio</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP: verify ── */}
      {step === 'verify' && verification?.member && (
        <div className="space-y-3">
          {/* Card del socio */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-green-700">
                  {verification.member.first_name.charAt(0)}{verification.member.last_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-lg leading-tight">
                    {verification.member.first_name} {verification.member.last_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    DNI {verification.member.dni} · <span className="font-mono">{verification.member.member_number}</span>
                  </p>
                </div>
                <User className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Resultado verificación */}
          {verification.verification?.allowed ? (
            <Card className="shadow-sm border-green-200 bg-green-50">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Habilitado para dispensar</p>
                    <div className="mt-1">
                      <StatusBadge status={verification.member.reprocann_status} />
                    </div>
                  </div>
                </div>

                {verification.month_stats && (
                  <div className="flex gap-4 pt-2 border-t border-green-200">
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-800">
                        {verification.month_stats.total_grams.toFixed(1)}g
                      </p>
                      <p className="text-xs text-green-600">dispensado este mes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-800">
                        {verification.month_stats.dispensation_count}
                      </p>
                      <p className="text-xs text-green-600">dispensas</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-red-200 bg-red-50">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800">Bloqueado — no puede dispensar</p>
                    <p className="text-sm text-red-600 mt-0.5">
                      {verification.verification?.reason ?? 'Verificá el estado del socio'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <Button
              onClick={handleProceed}
              disabled={!verification.verification?.allowed}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-11"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: confirm ── */}
      {step === 'confirm' && verification?.member && (
        <div className="space-y-3">
          {/* Mini resumen del socio */}
          <Card className="shadow-sm border-slate-200 bg-slate-50">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                  {verification.member.first_name.charAt(0)}{verification.member.last_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {verification.member.first_name} {verification.member.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{verification.member.member_number}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Formulario dispensa */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-5 pb-5 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-slate-500" />
                Datos de la dispensa
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Cantidad (gramos) *</Label>
                <Input
                  autoFocus
                  type="number"
                  placeholder="Ej: 5"
                  min="0.1"
                  max="30"
                  step="0.5"
                  value={quantityGrams}
                  onChange={(e) => setQuantityGrams(e.target.value)}
                  className="h-12 text-lg font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Genética *</Label>
                {lots && lots.length > 0 ? (
                  <Select
                    value={lotId}
                    onValueChange={(v) => {
                      const val = v ?? 'none'
                      setLotId(val)
                      if (val !== 'none') {
                        const lot = lots.find((l) => l.id === val)
                        if (lot) setGenetics(lot.genetics)
                      }
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccioná lote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin lote específico</SelectItem>
                      {lots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.genetics} — {lot.current_grams}g disponibles
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Ej: OG Kush"
                    value={genetics}
                    onChange={(e) => setGenetics(e.target.value)}
                    className="h-11"
                  />
                )}
              </div>

              {/* Si hay lote seleccionado pero quieren cambiar genética */}
              {lotId !== 'none' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Genética (editable)</Label>
                  <Input
                    value={genetics}
                    onChange={(e) => setGenetics(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Notas (opcional)</Label>
                <Input
                  placeholder="Observaciones..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Advertencia si supera el máximo mensual */}
              {verification.month_stats &&
                parseFloat(quantityGrams) > 0 &&
                verification.month_stats.total_grams + parseFloat(quantityGrams) > 30 && (
                  <div className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Esta dispensa llevaría al socio a{' '}
                      <strong>{(verification.month_stats.total_grams + parseFloat(quantityGrams)).toFixed(1)}g</strong>{' '}
                      este mes (máx. recomendado: 30g).
                    </span>
                  </div>
                )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('verify')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!quantityGrams || !genetics || loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Registrando...</>
              ) : (
                <><Syringe className="w-4 h-4" />Confirmar dispensa</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: done ── */}
      {step === 'done' && (
        <Card className="shadow-sm border-green-200 bg-green-50">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">Dispensa registrada</h3>
              {dispensationNumber && (
                <p className="font-mono text-2xl font-bold text-green-700 mt-1">
                  {dispensationNumber}
                </p>
              )}
              <p className="text-sm text-green-600 mt-2">
                {quantityGrams}g de {genetics} para{' '}
                {verification?.member?.first_name} {verification?.member?.last_name}
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={handleReset}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Syringe className="w-4 h-4" />
                Nueva dispensa
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dispensas')}
              >
                Ver historial
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: 'search', label: 'Buscar' },
  { key: 'verify', label: 'Verificar' },
  { key: 'confirm', label: 'Confirmar' },
  { key: 'done', label: 'Listo' },
]

function StepIndicator({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === step)
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, i) => {
        const isActive = s.key === step
        const isDone = i < currentIndex
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  isDone ? 'bg-green-500 text-white' :
                  isActive ? 'bg-slate-800 text-white ring-2 ring-slate-300 ring-offset-2' :
                  'bg-slate-100 text-slate-400'
                )}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-slate-800' : 'text-slate-400'
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 mb-4 mx-1 transition-all',
                i < currentIndex ? 'bg-green-400' : 'bg-slate-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
