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
    method:                  z.literal('transferencia'),
    amount_cash:             z.number().nonnegative().optional().default(0),
    amount_transfer:         z.number().positive('El monto de transferencia debe ser mayor a 0'),
    transfer_amount_received: z.number().nonnegative().optional(),
    transfer_detail:         z.string().max(500).optional(),
  }),
  z.object({
    method:                  z.literal('mixto'),
    amount_cash:             z.number().nonnegative('El monto en efectivo no puede ser negativo'),
    amount_transfer:         z.number().nonnegative('El monto en transferencia no puede ser negativo'),
    transfer_amount_received: z.number().nonnegative().optional(),
    transfer_detail:         z.string().max(500).optional(),
  }),
  z.object({
    method:                  z.literal('mixto_3'),
    amount_cash:             z.number().nonnegative('El monto en efectivo no puede ser negativo'),
    amount_transfer:         z.number().nonnegative('El monto en transferencia no puede ser negativo'),
    amount_cc:               z.number().nonnegative('El monto de cuenta corriente no puede ser negativo'),
    transfer_amount_received: z.number().nonnegative().optional(),
    transfer_detail:         z.string().max(500).optional(),
  }),
  z.object({
    method:          z.literal('cuenta_corriente'),
    cc_mode:         z.enum(['fiado', 'saldo']).optional().default('fiado'),
    amount_cash:     z.number().nonnegative().optional().default(0),
    amount_transfer: z.number().nonnegative().optional().default(0),
  }),
])

// ─── Schema individual de dispensa ──────────────────────────────────────────
export const dispensationSchema = z.object({
  lot_id:           z.string().uuid('ID de lote inválido'),
  genetics:         z.string().min(1, 'La genética es requerida').max(100),
  quantity_grams:   z.number().positive('Los gramos deben ser mayores a 0').max(500),
  notes:            z.string().max(500).optional(),
  discount_percent: z.number().int().refine(v => [0,5,10,15,20,25].includes(v), {
    message: 'El descuento solo puede ser 0, 5, 10, 15, 20 o 25',
  }).optional().default(0),
})

// ─── Request completo ────────────────────────────────────────────────────────
export const checkoutRequestSchema = z.object({
  member_id: z.string().uuid('ID de socio inválido'),

  dispensations: z.array(dispensationSchema).min(1, 'Se requiere al menos una dispensa'),

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
