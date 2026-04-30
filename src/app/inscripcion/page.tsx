'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { enrollmentSchema, type EnrollmentFormData } from '@/lib/validations/enrollment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Leaf, Loader2 } from 'lucide-react'

export default function InscripcionPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  })

  async function onSubmit(data: EnrollmentFormData) {
    setServerError(null)
    try {
      const res = await fetch('/api/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Error al enviar la solicitud')
        return
      }

      setSuccess(true)
    } catch {
      setServerError('Error de conexión. Intentá de nuevo.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">¡Solicitud enviada!</h2>
          <p className="text-sm text-slate-500">
            Tu solicitud de inscripción fue recibida. El equipo de Jamrock Club la revisará y te
            contactaremos en breve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-semibold">Jamrock Club</p>
            <p className="text-xs text-slate-400">Formulario de inscripción</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-xl font-semibold text-slate-800 mb-1">Solicitud de membresía</h1>
          <p className="text-sm text-slate-500 mb-6">
            Completá el formulario y nos pondremos en contacto para finalizar tu ingreso al club.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nombre y apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  placeholder="Juan"
                  {...register('first_name')}
                  className={errors.first_name ? 'border-red-400' : ''}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  placeholder="García"
                  {...register('last_name')}
                  className={errors.last_name ? 'border-red-400' : ''}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* DNI */}
            <div className="space-y-1.5">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                placeholder="30123456"
                maxLength={10}
                {...register('dni')}
                className={errors.dni ? 'border-red-400' : ''}
              />
              {errors.dni && <p className="text-xs text-red-500">{errors.dni.message}</p>}
            </div>

            {/* Email y teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-400' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+54 11 1234-5678"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Fecha de nacimiento */}
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Av. Corrientes 1234, CABA"
                {...register('address')}
              />
            </div>

            {/* REPROCANN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estado REPROCANN</Label>
                <Select
                  onValueChange={(v) => {
                    type RS = 'vigente' | 'en_tramite' | 'iniciar' | 'no_tramita' | 'baja' | 'no_aplica'
                    const val = v === 'none' ? null : (v as RS)
                    setValue('reprocann_status', val)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tengo</SelectItem>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="en_tramite">En trámite</SelectItem>
                    <SelectItem value="iniciar">Quiero iniciarlo</SelectItem>
                    <SelectItem value="no_tramita">No voy a tramitarlo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reprocann_number">N° de registro REPROCANN</Label>
                <Input
                  id="reprocann_number"
                  placeholder="RPC-XXXXX"
                  {...register('reprocann_number')}
                />
              </div>
            </div>

            {/* Info adicional */}
            <div className="space-y-1.5">
              <Label htmlFor="additional_info">Información adicional</Label>
              <Textarea
                id="additional_info"
                placeholder="Contanos brevemente por qué querés ser parte del club..."
                rows={3}
                {...register('additional_info')}
              />
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar solicitud'
              )}
            </Button>

            <p className="text-xs text-slate-400 text-center">
              Tu información es confidencial y solo será utilizada para tu membresía en el club.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
