export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Jamrock Club'

export const REPROCANN_STATUS_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  en_tramite: 'En trámite',
  iniciar: 'Iniciar trámite',
  no_tramita: 'No tramita',
  baja: 'Baja',
  no_aplica: 'No aplica',
}

export const CONDICION_LABELS: Record<string, string> = {
  delegacion_sistema_vigente: 'Del. Sistema Vigente',
  delegacion_sistema_en_tramite: 'Del. Sistema En Trámite',
  delegacion_sistema_pendiente: 'Del. Sistema Pendiente',
  delegacion_contrato_vigente: 'Del. Contrato Vigente',
  reiniciar: 'Reiniciar',
  no_delega: 'No Delega',
  no_tramita_reprocann: 'No Tramita REPROCANN',
  asociado_baja: 'Dado de Baja',
  no_aplica: 'No Aplica',
}

export const CULTIVADOR_LABELS: Record<string, string> = {
  jamrock: 'Jamrock (el club)',
  autocultivo: 'Autocultivo',
  otro: 'Otro cultivador',
}

export const DOMICILIO_CULTIVO_LABELS: Record<string, string> = {
  san_lorenzo_426: 'San Lorenzo 426',
  villa_allende: 'Villa Allende',
  personal: 'Domicilio personal',
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

export const PAYMENT_CONCEPT_LABELS: Record<string, string> = {
  afiliacion: 'Afiliación',
  cuota_mensual: 'Cuota mensual',
  cuota_anual: 'Cuota anual',
  venta: 'Venta',
  dispensa: 'Dispensa',
  otro: 'Otro',
}

export const MEMBER_TYPE_LABELS: Record<string, string> = {
  basico: 'Básico',
  administrativo: 'Administrativo',
  autoridad: 'Autoridad',
  ninguno: 'Ninguno',
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
