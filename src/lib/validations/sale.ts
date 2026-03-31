import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  description: z.string().max(300).optional().or(z.literal('')),
  category: z.string().max(50).optional().or(z.literal('')),
  price: z.coerce.number().positive('Debe ser mayor a 0').max(1000000),
  stock_quantity: z.coerce.number().int().nonnegative().max(100000),
  low_stock_threshold: z.coerce.number().int().nonnegative().max(1000),
})

export const saleSchema = z.object({
  product_id: z.string().uuid('Seleccioná un producto'),
  member_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().positive('Mínimo 1 unidad').max(9999),
  unit_price: z.coerce.number().positive('Debe ser mayor a 0'),
  payment_method: z.enum(['efectivo', 'transferencia', 'mixto']),
})

export const cashRegisterCloseSchema = z.object({
  actual_total: z.coerce.number().nonnegative(),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type ProductFormData = z.infer<typeof productSchema>
export type SaleFormData = z.infer<typeof saleSchema>
export type CashRegisterCloseData = z.infer<typeof cashRegisterCloseSchema>

export const CATEGORIES = ['Indumentaria', 'Accesorios', 'Alimentación', 'Papelería', 'Otro'] as const
