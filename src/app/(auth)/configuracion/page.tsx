'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRole } from '@/hooks/useRole'
import { useAppConfig, useSaveAppConfig } from '@/hooks/useAppConfig'
import { useDispensationConfig } from '@/hooks/useDispensationConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Settings, Lock, Bell, Users, CheckCircle2, XCircle, Loader2, ShoppingCart, ToggleLeft, ToggleRight, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────
type ClubForm = {
  club_name: string
  club_address: string
  default_membership_fee: string
  max_grams_per_dispensa: string
  club_phone: string
}
type AlertForm = {
  alert_stock_medicinal_g: string
  alert_reprocann_days: string
  alert_cuota_days: string
}
type Operator = {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

const CLUB_DEFAULTS: ClubForm = { club_name: '', club_address: '', default_membership_fee: '', max_grams_per_dispensa: '', club_phone: '' }
const ALERT_DEFAULTS: AlertForm = { alert_stock_medicinal_g: '100', alert_reprocann_days: '30', alert_cuota_days: '35' }

const ROLE_LABEL: Record<UserRole, string> = { gerente: 'Gerente', secretaria: 'Secretaria', cultivador: 'Cultivador' }
const ROLE_COLOR: Record<UserRole, string> = {
  gerente: 'bg-purple-50 text-purple-700 border-purple-200',
  secretaria: 'bg-blue-50 text-blue-700 border-blue-200',
  cultivador: 'bg-green-50 text-green-700 border-green-200',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useOperators() {
  return useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await fetch('/api/operators')
      if (!res.ok) throw new Error('Error cargando operadores')
      const body = await res.json()
      return body.operators
    },
  })
}
function useToggleOperator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch('/api/operators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error) }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { role } = useRole()
  const isGerente = role === 'gerente'
  const readOnly = !isGerente

  const { data: config, isLoading: configLoading } = useAppConfig()
  const saveConfig = useSaveAppConfig()

  const [clubForm, setClubForm] = useState<ClubForm>(CLUB_DEFAULTS)
  const [alertForm, setAlertForm] = useState<AlertForm>(ALERT_DEFAULTS)
  const [clubSaved, setClubSaved] = useState(false)
  const [alertSaved, setAlertSaved] = useState(false)
  const [clubError, setClubError] = useState('')
  const [alertError, setAlertError] = useState('')

  useEffect(() => {
    if (config) {
      setClubForm({
        club_name: config.club_name ?? '',
        club_address: config.club_address ?? '',
        default_membership_fee: config.default_membership_fee ?? '',
        max_grams_per_dispensa: config.max_grams_per_dispensa ?? '',
        club_phone: config.club_phone ?? '',
      })
      setAlertForm({
        alert_stock_medicinal_g: config.alert_stock_medicinal_g ?? '100',
        alert_reprocann_days: config.alert_reprocann_days ?? '30',
        alert_cuota_days: config.alert_cuota_days ?? '35',
      })
    }
  }, [config])

  async function saveClub(e: React.FormEvent) {
    e.preventDefault(); setClubError(''); setClubSaved(false)
    try { await saveConfig.mutateAsync(clubForm); setClubSaved(true) }
    catch (err) { setClubError(err instanceof Error ? err.message : 'Error') }
  }
  async function saveAlerts(e: React.FormEvent) {
    e.preventDefault(); setAlertError(''); setAlertSaved(false)
    try { await saveConfig.mutateAsync(alertForm); setAlertSaved(true) }
    catch (err) { setAlertError(err instanceof Error ? err.message : 'Error') }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />Configuración
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Parámetros generales del club.{readOnly && ' Solo el gerente puede editar estos valores.'}
        </p>
      </div>

      {/* ── Sección 1: Club ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            Datos del club{readOnly && <Lock className="w-4 h-4 text-slate-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <form onSubmit={saveClub} className="space-y-4">
              <Field label="Nombre del club" value={clubForm.club_name} onChange={v => setClubForm(p => ({ ...p, club_name: v }))} placeholder="Ej: Jamrock Cannabis Club" disabled={readOnly} />
              <Field label="Dirección" value={clubForm.club_address} onChange={v => setClubForm(p => ({ ...p, club_address: v }))} placeholder="Ej: Av. Corrientes 1234, CABA" disabled={readOnly} />
              <Field label="Teléfono de contacto" value={clubForm.club_phone} onChange={v => setClubForm(p => ({ ...p, club_phone: v }))} placeholder="+54 11 4567-8901" disabled={readOnly} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cuota mensual ($)" type="number" value={clubForm.default_membership_fee} onChange={v => setClubForm(p => ({ ...p, default_membership_fee: v }))} placeholder="5000" disabled={readOnly} />
                <Field label="Máx. gramos por dispensa" type="number" value={clubForm.max_grams_per_dispensa} onChange={v => setClubForm(p => ({ ...p, max_grams_per_dispensa: v }))} placeholder="30" disabled={readOnly} />
              </div>
              <SaveRow error={clubError} saved={clubSaved} pending={saveConfig.isPending} readOnly={readOnly} />
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 2: Umbrales de alertas ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />Umbrales de alertas
            {readOnly && <Lock className="w-4 h-4 text-slate-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <form onSubmit={saveAlerts} className="space-y-4">
              <Field
                label="Stock medicinal bajo (gramos)"
                type="number"
                value={alertForm.alert_stock_medicinal_g}
                onChange={v => setAlertForm(p => ({ ...p, alert_stock_medicinal_g: v }))}
                placeholder="100"
                helper="Alertar cuando un lote tiene menos de X gramos"
                disabled={readOnly}
              />
              <Field
                label="REPROCANN — días de aviso previo"
                type="number"
                value={alertForm.alert_reprocann_days}
                onChange={v => setAlertForm(p => ({ ...p, alert_reprocann_days: v }))}
                placeholder="30"
                helper="Alertar X días antes del vencimiento"
                disabled={readOnly}
              />
              <Field
                label="Cuota — días sin pago para alertar"
                type="number"
                value={alertForm.alert_cuota_days}
                onChange={v => setAlertForm(p => ({ ...p, alert_cuota_days: v }))}
                placeholder="35"
                helper="Alertar si un socio no pagó en X días"
                disabled={readOnly}
              />
              <SaveRow error={alertError} saved={alertSaved} pending={saveConfig.isPending} readOnly={readOnly} />
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 3: Dispensas y Checkout ── */}
      <CheckoutConfigSection isGerente={isGerente} />

      {/* ── Sección 4: Horas trabajadas (solo gerente) ── */}
      {isGerente && <HorasSection />}

      {/* ── Sección 5: Operadores (solo gerente) ── */}
      {isGerente && <OperatorsSection />}
    </div>
  )
}

// ─── Checkout Config ──────────────────────────────────────────────────────────
function CheckoutConfigSection({ isGerente }: { isGerente: boolean }) {
  const qc = useQueryClient()
  const { data: config, isLoading } = useDispensationConfig()

  const [enabled,       setEnabled]       = useState(false)
  const [pricePerGram,  setPricePerGram]  = useState('')
  const [allowCredit,   setAllowCredit]   = useState(true)
  const [showCCBalance, setShowCCBalance] = useState(true)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState('')

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setPricePerGram(config.pricePerGram > 0 ? String(config.pricePerGram) : '')
      setAllowCredit(config.allowCredit)
      setShowCCBalance(config.showCCBalance)
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/checkout/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispensation_price_per_gram: { enabled, price: parseFloat(pricePerGram) || 0 },
          checkout_allow_credit:       { enabled: allowCredit },
          checkout_show_cc_balance:    { enabled: showCCBalance },
        }),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Error') }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkout-config'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Error'),
  })

  function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={cn('flex-shrink-0 transition-colors', disabled && 'opacity-50 cursor-not-allowed')}
      >
        {value
          ? <ToggleRight className="w-7 h-7 text-[#2DC814]" />
          : <ToggleLeft  className="w-7 h-7 text-slate-500" />}
      </button>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-500" />
          Dispensas y Checkout
          {!isGerente && <Lock className="w-4 h-4 text-slate-400" />}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Configuración del flujo de dispensa y cobro</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="space-y-4">
            {/* Cobrar dispensa */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.05]">
              <div>
                <p className="text-sm font-medium text-slate-200">Cobrar dispensa</p>
                <p className="text-xs text-slate-500">Habilitar precio por gramo al dispensar</p>
              </div>
              <Toggle value={enabled} onChange={setEnabled} disabled={!isGerente} />
            </div>
            {enabled && (
              <div className="space-y-1.5 pl-1">
                <Label className="text-slate-300 text-xs">Precio por gramo ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={10}
                  placeholder="ej: 500"
                  value={pricePerGram}
                  onChange={e => setPricePerGram(e.target.value)}
                  disabled={!isGerente}
                  className="h-9 max-w-[180px]"
                />
              </div>
            )}

            {/* Permitir fiado */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.05]">
              <div>
                <p className="text-sm font-medium text-slate-200">Permitir cuenta corriente</p>
                <p className="text-xs text-slate-500">Habilitar pago en fiado al momento del checkout</p>
              </div>
              <Toggle value={allowCredit} onChange={setAllowCredit} disabled={!isGerente} />
            </div>

            {/* Mostrar saldo CC */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-slate-200">Mostrar saldo de cuenta corriente</p>
                <p className="text-xs text-slate-500">Visible en el paso de pago del checkout</p>
              </div>
              <Toggle value={showCCBalance} onChange={setShowCCBalance} disabled={!isGerente} />
            </div>

            {/* Guardar */}
            {isGerente && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saveMutation.isPending}
                  onClick={() => { setError(''); saveMutation.mutate() }}
                >
                  {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : 'Guardar'}
                </Button>
                {error  && <p className="text-sm text-red-500">{error}</p>}
                {saved  && <p className="text-sm text-green-500 font-medium">Guardado ✓</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Horas ───────────────────────────────────────────────────────────────────
function HorasSection() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />Horas trabajadas
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Registro de sesiones y cálculo de sueldos por operador</p>
      </CardHeader>
      <CardContent>
        <Link href="/configuracion/horas">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            Ver registro de horas
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

// ─── Operadores ───────────────────────────────────────────────────────────────
function OperatorsSection() {
  const { data: operators = [], isLoading } = useOperators()
  const toggle = useToggleOperator()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />Operadores del sistema
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Usuarios con acceso al sistema. Para crear nuevos usuarios usá Supabase Authentication.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : operators.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin operadores registrados</p>
        ) : (
          <div className="space-y-2">
            {operators.map(op => (
              <div key={op.id} className={cn('flex items-center justify-between px-4 py-3 rounded-xl border', op.is_active ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/[0.02] border-white/[0.05] opacity-60')}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold', op.is_active ? 'bg-green-900/40 text-green-400' : 'bg-white/[0.06] text-slate-500')}>
                    {op.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{op.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-xs', ROLE_COLOR[op.role])}>{ROLE_LABEL[op.role]}</Badge>
                      {!op.is_active && <span className="text-xs text-slate-400">Inactivo</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggle.mutate({ id: op.id, is_active: !op.is_active })}
                  disabled={toggle.isPending}
                  title={op.is_active ? 'Desactivar' : 'Activar'}
                  className={cn('flex-shrink-0 p-1 rounded-lg transition-colors', op.is_active ? 'text-green-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-400 hover:bg-green-50 hover:text-green-500')}
                >
                  {toggle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : op.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text', helper, disabled }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; helper?: string; disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} />
      {helper && <p className="text-xs text-slate-400">{helper}</p>}
    </div>
  )
}

function SaveRow({ error, saved, pending, readOnly }: { error: string; saved: boolean; pending: boolean; readOnly: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {!readOnly && (
        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={pending}>
          {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : 'Guardar'}
        </Button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600 font-medium">Guardado ✓</p>}
    </div>
  )
}
