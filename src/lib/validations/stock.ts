import { z } from 'zod'

export const stockLotSchema = z.object({
  genetics: z.string().min(1, 'La genética es requerida').max(100),
  initial_grams: z.coerce
    .number()
    .positive('Debe ser mayor a 0')
    .max(10000, 'Máximo 10kg por lote'),
  cost_per_gram: z.coerce
    .number()
    .nonnegative()
    .optional()
    .nullable(),
  lot_date: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type StockLotFormData = z.infer<typeof stockLotSchema>
