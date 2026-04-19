'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reverseMovementSchema } from '@/lib/validations/current-accounts'
import { useReverseMovement } from '@/hooks/useReverseMovement'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { z } from 'zod'
import type { CurrentAccountMovement } from '@/types/current-accounts'

type FormData = z.infer<typeof reverseMovementSchema>

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

interface ReverseMovementModalProps {
  open: boolean
  onClose: () => void
  movement: CurrentAccountMovement | null
  accountId: string
}

export function ReverseMovementModal({ open, onClose, movement, accountId }: ReverseMovementModalProps) {
  const reverseMutation = useReverseMovement()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(reverseMovementSchema),
  })

  async function onSubmit(data: FormData) {
    if (!movement) return
    try {
      await reverseMutation.mutateAsync({
        movement_id: movement.id,
        reason: data.reason,
        account_id: accountId,
      })
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Revertir movimiento
          </DialogTitle>
        </DialogHeader>

        {movement && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Movimiento</span>
              <span className="font-mono text-slate-700">{movement.movement_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo</span>
              <span className="text-slate-700 capitalize">{movement.movement_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monto</span>
              <span className="font-semibold text-slate-800">{ARS.format(movement.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Concepto</span>
              <span className="text-slate-700 capitalize">{movement.concept.replace(/_/g, ' ')}</span>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-600">
          Se creará un movimiento opuesto para compensar este registro. Esta acción es registrada y auditable.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motivo de la reversión *</Label>
            <Textarea
              placeholder="Explicá brevemente por qué se revierte este movimiento..."
              rows={3}
              {...register('reason')}
              className={errors.reason ? 'border-red-400' : ''}
            />
            {errors.reason && (
              <p className="text-xs text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {reverseMutation.error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">
              {(reverseMutation.error as Error).message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || reverseMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmitting || reverseMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
              ) : (
                'Confirmar reversión'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
