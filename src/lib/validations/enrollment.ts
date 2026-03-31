import { z } from 'zod'

export const enrollmentSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  dni: z
    .string()
    .min(7, 'DNI inválido')
    .max(10, 'DNI inválido')
    .regex(/^\d+$/, 'Solo números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  reprocann_status: z
    .enum(['activo', 'en_tramite', 'vencido'])
    .optional()
    .nullable(),
  reprocann_number: z.string().max(50).optional().or(z.literal('')),
  additional_info: z.string().max(1000).optional().or(z.literal('')),
})

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>
