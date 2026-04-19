'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { memberSchema, memberDefaults, type MemberFormData } from '@/lib/validations/member'
import { useCreateMember, useUpdateMember } from '@/hooks/useMembers'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Save, X } from 'lucide-react'
import type { Member } from '@/types/database'

interface MemberFormProps {
  member?: Member
  mode: 'create' | 'edit'
}

export function MemberForm({ member, mode }: MemberFormProps) {
  const router = useRouter()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? {
          first_name: member.first_name,
          last_name: member.last_name,
          dni: member.dni,
          email: member.email ?? '',
          phone: member.phone ?? '',
          birth_date: member.birth_date ?? '',
          address: member.address ?? '',
          member_type: (member.member_type as MemberFormData['member_type']) ?? 'standard',
          membership_fee: member.membership_fee ?? null,
          reprocann_status: member.reprocann_status as MemberFormData['reprocann_status'],
          reprocann_expiry: member.reprocann_expiry ?? '',
          reprocann_number: member.reprocann_number ?? '',
          notes: member.notes ?? '',
        }
      : memberDefaults,
  })

  const onSubmit = async (data: MemberFormData) => {
    setServerError(null)
    try {
      if (mode === 'create') {
        const newMember = await createMember.mutateAsync(data)
        router.push(`/socios/${newMember.id}`)
      } else if (member) {
        await updateMember.mutateAsync({ id: member.id, formData: data })
        router.push(`/socios/${member.id}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      if (msg.includes('unique') && msg.includes('dni')) {
        setServerError('Ya existe un socio con ese DNI.')
      } else {
        setServerError('Error al guardar. Verificá los datos e intentá de nuevo.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {serverError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {serverError}
        </div>
      )}

      {/* Datos personales */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nombre *" error={errors.first_name?.message}>
            <Input {...register('first_name')} placeholder="Juan" className="h-10" />
          </FormField>

          <FormField label="Apellido *" error={errors.last_name?.message}>
            <Input {...register('last_name')} placeholder="García" className="h-10" />
          </FormField>

          <FormField label="DNI *" error={errors.dni?.message}>
            <Input {...register('dni')} placeholder="12345678" inputMode="numeric" className="h-10" />
          </FormField>

          <FormField label="Fecha de nacimiento" error={errors.birth_date?.message}>
            <Input {...register('birth_date')} type="date" className="h-10" />
          </FormField>

          <FormField label="Teléfono" error={errors.phone?.message}>
            <Input {...register('phone')} placeholder="+54 9 11 1234-5678" className="h-10" />
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="juan@email.com" className="h-10" />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Dirección" error={errors.address?.message}>
              <Input {...register('address')} placeholder="Calle 123, Ciudad" className="h-10" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Membresía */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Membresía</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tipo de socio">
            <Select
              defaultValue={watch('member_type') ?? 'standard'}
              onValueChange={(v) => setValue('member_type', v as MemberFormData['member_type'])}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Estándar</SelectItem>
                <SelectItem value="therapeutic">Terapéutico</SelectItem>
                <SelectItem value="honorary">Honorario</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Cuota mensual (ARS)" error={errors.membership_fee?.message}>
            <Input
              {...register('membership_fee')}
              type="number"
              placeholder="5000"
              min={0}
              className="h-10"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* REPROCANN */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Estado REPROCANN</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Estado">
            <Select
              defaultValue={watch('reprocann_status') ?? 'en_tramite'}
              onValueChange={(v) => setValue('reprocann_status', v as MemberFormData['reprocann_status'])}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">✅ Activo</SelectItem>
                <SelectItem value="en_tramite">🟡 En trámite</SelectItem>
                <SelectItem value="vencido">🔴 Vencido</SelectItem>
                <SelectItem value="cancelado">⚫ Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="N° REPROCANN" error={errors.reprocann_number?.message}>
            <Input {...register('reprocann_number')} placeholder="REPR-XXXXX" className="h-10" />
          </FormField>

          <FormField label="Fecha vencimiento" error={errors.reprocann_expiry?.message}>
            <Input {...register('reprocann_expiry')} type="date" className="h-10" />
          </FormField>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Notas internas</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Observaciones, información adicional..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4" />
          {isSubmitting
            ? 'Guardando...'
            : mode === 'create'
            ? 'Crear socio'
            : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
