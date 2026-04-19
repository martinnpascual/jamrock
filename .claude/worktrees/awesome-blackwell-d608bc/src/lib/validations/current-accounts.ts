import { z } from 'zod'

export const createMovementSchema = z.object({
  account_id: z.string().uuid('ID de cuenta inválido'),
  movement_type: z.enum(['credito', 'debito'], { error: 'Tipo requerido' }),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').max(99999999),
  concept: z.string().min(1, 'El concepto es requerido').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
})
export type CreateMovementData = z.infer<typeof createMovementSchema>

export const reverseMovementSchema = z.object({
  movement_id: z.string().uuid('ID de movimiento inválido'),
  reason: z.string().min(5, 'La razón debe tener al menos 5 caracteres').max(500),
})
export type ReverseMovementData = z.infer<typeof reverseMovementSchema>

export const createAccountSchema = z
  .object({
    entity_type: z.enum(['socio', 'proveedor']),
    member_id: z.string().uuid().optional().nullable(),
    supplier_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (d) =>
      (d.entity_type === 'socio' && !!d.member_id && !d.supplier_id) ||
      (d.entity_type === 'proveedor' && !!d.supplier_id && !d.member_id),
    { message: 'La entidad debe coincidir con el tipo seleccionado' }
  )
export type CreateAccountData = z.infer<typeof createAccountSchema>

export const accountFiltersSchema = z.object({
  entity_type: z.enum(['socio', 'proveedor']).optional(),
  search: z.string().optional(),
  balance_status: z.enum(['positive', 'negative', 'zero']).optional(),
})

export const exportFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  format: z.enum(['csv']).default('csv'),
})

export const MOVEMENT_CONCEPTS = [
  { value: 'pago_adelantado', label: 'Pago adelantado' },
  { value: 'pago_proveedor', label: 'Pago a proveedor' },
  { value: 'ajuste', label: 'Ajuste de saldo' },
  { value: 'cargo_manual', label: 'Cargo manual' },
  { value: 'cuota_mensual', label: 'Cuota mensual' },
  { value: 'otro', label: 'Otro' },
] as const
