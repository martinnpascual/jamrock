import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  event_date: z.string().min(1, 'La fecha es obligatoria'),
  location: z.string().optional().nullable(),
  total_cost: z.coerce.number().min(0).default(0),
  total_income: z.coerce.number().min(0).default(0),
  status: z.enum(['planificado', 'activo', 'cerrado', 'cancelado']).default('planificado'),
})

export type EventFormData = z.infer<typeof eventSchema>

export const EVENT_STATUSES = [
  { value: 'planificado', label: 'Planificado', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'activo',      label: 'Activo',      color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'cerrado',     label: 'Cerrado',      color: 'text-slate-600 bg-slate-100 border-slate-200' },
  { value: 'cancelado',   label: 'Cancelado',    color: 'text-red-600 bg-red-50 border-red-200' },
] as const
