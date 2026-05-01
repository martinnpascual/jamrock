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
  // baja y vencido son estados internos — no los selecciona un nuevo inscripto
  reprocann_status: z
    .enum(['vigente', 'en_tramite', 'iniciar', 'no_tramita', 'no_aplica'])
    .optional()
    .nullable(),
  reprocann_number: z.string().max(50).optional().or(z.literal('')),
  cultivador: z
    .enum(['jamrock', 'autocultivo', 'otro'])
    .optional()
    .nullable(),
  domicilio_cultivo: z
    .enum(['san_lorenzo_426', 'villa_allende', 'personal'])
    .optional()
    .nullable(),
  additional_info: z.string().max(1000).optional().or(z.literal('')),
})

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>
