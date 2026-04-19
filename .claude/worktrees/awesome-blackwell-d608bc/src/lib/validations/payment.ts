import { z } from 'zod'

export const paymentSchema = z.object({
  member_id: z.string().uuid('Seleccioná un socio'),
  amount: z.coerce
    .number()
    .positive('El monto debe ser mayor a 0')
    .max(1000000),
  concept: z.string().min(1, 'El concepto es requerido').max(200),
  payment_method: z.enum(['efectivo', 'transferencia', 'mixto']),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type PaymentFormData = z.infer<typeof paymentSchema>

export const CONCEPTS = [
  { value: 'cuota_mensual', label: 'Cuota mensual' },
  { value: 'inscripcion', label: 'Inscripción' },
  { value: 'dispensa', label: 'Dispensa' },
  { value: 'venta', label: 'Venta' },
  { value: 'otro', label: 'Otro' },
] as const
