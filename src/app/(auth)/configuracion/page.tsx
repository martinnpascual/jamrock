'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/hooks/useRole'
import { useAppConfig, useSaveAppConfig } from '@/hooks/useAppConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings, Lock } from 'lucide-react'

type FormState = {
  club_name: string
  club_address: string
  default_membership_fee: string
  max_grams_per_dispensa: string
  club_phone: string
}

const DEFAULTS: FormState = {
  club_name: '',
  club_address: '',
  default_membership_fee: '',
  max_grams_per_dispensa: '',
  club_phone: '',
}

export default function ConfiguracionPage() {
  const { isGerente } = useRole()
  const { data: config, isLoading } = useAppConfig()
  const saveConfig = useSaveAppConfig()

  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync form cuando lleguen los datos
  useEffect(() => {
    if (config) {
      setForm({
        club_name: config.club_name ?? '',
        club_address: config.club_address ?? '',
        default_membership_fee: config.default_membership_fee ?? '',
        max_grams_per_dispensa: config.max_grams_per_dispensa ?? '',
        club_phone: config.club_phone ?? '',
      })
    }
  }, [config])

  function handleChange(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (saveError) setSaveError(null)
    if (saveSuccess) setSaveSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await saveConfig.mutateAsync(form)
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const readOnly = !isGerente

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          Configuración
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Parámetros generales del club. {readOnly && 'Solo el gerente puede editar estos valores.'}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            Configuración del club
            {readOnly && <Lock className="w-4 h-4 text-slate-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre del club */}
            <div className="space-y-1.5">
              <Label htmlFor="club_name">Nombre del club</Label>
              <Input
                id="club_name"
                value={form.club_name}
                onChange={(e) => handleChange('club_name', e.target.value)}
                placeholder="Ej: Jamrock Cannabis Club"
                disabled={readOnly}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <Label htmlFor="club_address">Dirección</Label>
              <Input
                id="club_address"
                value={form.club_address}
                onChange={(e) => handleChange('club_address', e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
                disabled={readOnly}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label htmlFor="club_phone">Teléfono de contacto</Label>
              <Input
                id="club_phone"
                value={form.club_phone}
                onChange={(e) => handleChange('club_phone', e.target.value)}
                placeholder="Ej: +54 11 4567-8901"
                disabled={readOnly}
              />
            </div>

            {/* Cuota mensual */}
            <div className="space-y-1.5">
              <Label htmlFor="default_membership_fee">Cuota mensual default ($)</Label>
              <Input
                id="default_membership_fee"
                type="number"
                min="0"
                step="any"
                value={form.default_membership_fee}
                onChange={(e) => handleChange('default_membership_fee', e.target.value)}
                placeholder="Ej: 5000"
                disabled={readOnly}
              />
            </div>

            {/* Máximo gramos por dispensa */}
            <div className="space-y-1.5">
              <Label htmlFor="max_grams_per_dispensa">Máximo gramos por dispensa</Label>
              <Input
                id="max_grams_per_dispensa"
                type="number"
                min="0"
                step="any"
                value={form.max_grams_per_dispensa}
                onChange={(e) => handleChange('max_grams_per_dispensa', e.target.value)}
                placeholder="Ej: 30"
                disabled={readOnly}
              />
            </div>

            {/* Feedback */}
            {saveError && (
              <p className="text-sm text-red-500">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-600 font-medium">Configuración guardada correctamente.</p>
            )}

            {/* Botón — solo para gerente */}
            {!readOnly && (
              <div className="pt-1">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saveConfig.isPending}
                >
                  {saveConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
