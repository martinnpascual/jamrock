'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createMovementSchema, MOVEMENT_CONCEPTS } from '@/lib/validations/current-accounts'
import { useCreateMovement } from '@/hooks/useCreateMovement'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'

type FormData = z.infer<typeof createMovementSchema>

interface NewMovementModalProps {
  open: boolean
  onClose: () => void
  accountId: string
  entityName?: string
}

export function NewMovementModal({ open, onClose, accountId, entityName }: NewMovementModalProps) {
  const createMutation = useCreateMovement()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createMovementSchema),
    defaultValues: { account_id: accountId },
  })

  async function onSubmit(data: FormData) {
    try {
      await createMutation.mutateAsync({ ...data, account_id: accountId })
      reset()
      onClose()
    } catch {
      // error shown below
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento manual</DialogTitle>
          {entityName && (
            <p className="text-sm text-slate-500">{entityName}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select onValueChange={(v) => setValue('movement_type', v as 'credito' | 'debito')}>
              <SelectTrigger className={errors.movement_type ? 'border-red-400' : ''}>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">Crédito (a favor)</SelectItem>
                <SelectItem value="debito">Débito (deuda)</SelectItem>
              </SelectContent>
            </Select>
            {errors.movement_type && (
              <p className="text-xs text-red-500">{errors.movement_type.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label>Monto ($) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount')}
              className={errors.amount ? 'border-red-400' : ''}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label>Concepto *</Label>
            <Select onValueChange={(v) => setValue('concept', v as string)}>
              <SelectTrigger className={errors.concept ? 'border-red-400' : ''}>
                <SelectValue placeholder="Seleccionar concepto..." />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_CONCEPTS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.concept && (
              <p className="text-xs text-red-500">{errors.concept.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Detalle opcional del movimiento..."
              rows={2}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">
              {(createMutation.error as Error).message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting || createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
