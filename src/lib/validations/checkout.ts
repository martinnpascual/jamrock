import { z } from 'zod'

// ─── Item del carrito ────────────────────────────────────────────────────────
export const checkoutItemSchema = z.object({
  product_id: z.string().uuid('ID de producto inválido'),
  quantity:   z.number().int().positive('La cantidad debe ser mayor a 0'),
})

// ─── Información de pago ─────────────────────────────────────────────────────
export const checkoutPaymentSchema = z.discriminatedUnion('method', [
  z.object({
    method:          z.literal('efectivo'),
    amount_cash:     z.number().positive('El monto en efectivo debe ser mayor a 0'),
    amount_transfer: z.number().nonnegative().optional().default(0),
  }),
  z.object({
    method:          z.literal('transferencia'),
    amount_cash:     z.number().nonnegative().optional().default(0),
    amount_transfer: z.number().positive('El monto de transferencia debe ser mayor a 0'),
  }),
  z.object({
    method:          z.literal('mixto'),
    amount_cash:     z.number().nonnegative('El monto en efectivo no puede ser negativo'),
    amount_transfer: z.number().nonnegative('El monto en transferencia no puede ser negativo'),
  }),
  z.object({
    method:          z.literal('cuenta_corriente'),
    amount_cash:     z.number().nonnegative().optional().default(0),
    amount_transfer: z.number().nonnegative().optional().default(0),
  }),
])

// ─── Request completo ────────────────────────────────────────────────────────
export const checkoutRequestSchema = z.object({
  member_id: z.string().uuid('ID de socio inválido'),

  dispensation: z.object({
    lot_id:         z.string().uuid('ID de lote inválido'),
    genetics:       z.string().min(1, 'La genética es requerida').max(100),
    quantity_grams: z.number().positive('Los gramos deben ser mayores a 0').max(500),
    notes:          z.string().max(500).optional(),
  }),

  items: z.array(checkoutItemSchema).optional().default([]),

  payment: checkoutPaymentSchema,
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type CheckoutItem    = z.infer<typeof checkoutItemSchema>

// ─── Config update ───────────────────────────────────────────────────────────
export const checkoutConfigSchema = z.object({
  dispensation_price_per_gram: z.object({
    enabled: z.boolean(),
    price:   z.number().nonnegative(),
  }).optional(),
  checkout_allow_credit: z.object({
    enabled: z.boolean(),
  }).optional(),
  checkout_show_cc_balance: z.object({
    enabled: z.boolean(),
  }).optional(),
})

export type CheckoutConfig = z.infer<typeof checkoutConfigSchema>
