export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Jamrock Club'

export const REPROCANN_STATUS_LABELS: Record<string, string> = {
  activo: 'Activo',
  en_tramite: 'En trámite',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
}

export const ROLE_LABELS: Record<string, string> = {
  gerente: 'Gerente',
  secretaria: 'Secretaria',
  cultivador: 'Cultivador',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
}

export const MEMBER_TYPE_LABELS: Record<string, string> = {
  standard: 'Estándar',
  therapeutic: 'Terapéutico',
  honorary: 'Honorario',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  planificado: 'Planificado',
  activo: 'Activo',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
}

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}
