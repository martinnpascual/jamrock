import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150),
  type: z.enum(['medicinal', 'comercial', 'ambos']),
  contact_name: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const supplyRecordSchema = z.object({
  supplier_id: z.string().uuid('Seleccioná un proveedor'),
  description: z.string().min(1, 'La descripción es requerida').max(300),
  quantity: z.coerce.number().positive().optional().nullable(),
  unit_cost: z.coerce.number().nonnegative().optional().nullable(),
  total_cost: z.coerce.number().nonnegative().optional().nullable(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
export type SupplyRecordFormData = z.infer<typeof supplyRecordSchema>
