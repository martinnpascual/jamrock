import { z } from 'zod'

export const memberSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  dni: z.string().min(7, 'DNI inválido').max(10, 'DNI inválido').regex(/^\d+$/, 'Solo números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  member_type: z.enum(['standard', 'therapeutic', 'honorary']),
  membership_fee: z.coerce.number().positive('Debe ser mayor a 0').optional().nullable(),
  reprocann_status: z.enum(['activo', 'en_tramite', 'vencido', 'cancelado']),
  reprocann_expiry: z.string().optional().nullable(),
  reprocann_number: z.string().optional(),
  notes: z.string().optional(),
})

export type MemberFormData = z.infer<typeof memberSchema>

export const memberDefaults: MemberFormData = {
  first_name: '',
  last_name: '',
  dni: '',
  email: '',
  phone: '',
  birth_date: '',
  address: '',
  member_type: 'standard',
  membership_fee: null,
  reprocann_status: 'en_tramite',
  reprocann_expiry: null,
  reprocann_number: '',
  notes: '',
}
