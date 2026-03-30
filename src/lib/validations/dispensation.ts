import { z } from 'zod'

export const dispensationSchema = z.object({
  member_id: z.string().uuid('Socio inválido'),
  quantity_grams: z.coerce
    .number()
    .positive('Debe ser mayor a 0')
    .max(30, 'Máximo 30g por dispensa'),
  genetics: z.string().min(1, 'La genética es requerida').max(100),
  lot_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
})

export type DispensationFormData = z.infer<typeof dispensationSchema>
