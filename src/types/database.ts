export type UserRole = 'gerente' | 'secretaria' | 'cultivador'
export type ReprocannStatus = 'vigente' | 'en_tramite' | 'iniciar' | 'no_tramita' | 'baja' | 'no_aplica'
export type MemberType = 'basico' | 'administrativo' | 'autoridad' | 'ninguno'
export type Cultivador = 'jamrock' | 'autocultivo' | 'otro'
export type DomicilioCultivo = 'san_lorenzo_426' | 'villa_allende' | 'personal'
export type Condicion =
  | 'delegacion_sistema_vigente'
  | 'delegacion_sistema_en_tramite'
  | 'delegacion_sistema_pendiente'
  | 'delegacion_contrato_vigente'
  | 'reiniciar'
  | 'no_delega'
  | 'no_tramita_reprocann'
  | 'asociado_baja'
  | 'no_aplica'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto'
export type PaymentConcept = 'afiliacion' | 'cuota_mensual' | 'cuota_anual' | 'venta' | 'dispensa' | 'otro'
export type Currency = 'ars' | 'usd'
export type SupplierType = 'medicinal' | 'comercial' | 'ambos'
export type EventStatus = 'planificado' | 'activo' | 'cerrado' | 'cancelado'
export type EnrollmentStatus = 'pendiente' | 'aprobada' | 'rechazada'
export type CashRegisterStatus = 'abierta' | 'cerrada'
export type DispensationType = 'normal' | 'anulacion'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  member_number: string
  first_name: string
  last_name: string
  dni: string
  cuit: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  member_type: MemberType
  membership_fee: number | null
  // REPROCANN
  reprocann_status: ReprocannStatus
  reprocann_expiry: string | null
  reprocann_number: string | null
  // Cultivo
  cultivador: Cultivador
  domicilio_cultivo: DomicilioCultivo
  // Condición calculada (GENERATED ALWAYS — nunca editar)
  condicion: Condicion
  // QR y foto
  qr_code: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface Dispensation {
  id: string
  dispensation_number: string
  member_id: string
  quantity_grams: number
  genetics: string
  lot_id: string | null
  type: DispensationType
  nullifies_id: string | null
  notes: string | null
  // Precio y descuento (registrado al momento de dispensar)
  price_per_gram: number | null
  subtotal: number | null
  discount_percent: number | null
  discount_amount: number | null
  total_amount: number | null
  payment_method: string | null
  payment_status: 'pagado' | 'fiado' | 'parcial' | 'sin_cargo' | null
  condicion_at_dispense: Condicion | null
  created_at: string
  created_by: string | null
}

export interface MemberConditionHistory {
  id: string
  member_id: string
  old_condicion: Condicion | null
  new_condicion: Condicion
  old_reprocann_status: ReprocannStatus | null
  new_reprocann_status: ReprocannStatus | null
  changed_at: string
  changed_by: string | null
  reason: string | null
}

export interface MedicalStockLot {
  id: string
  genetics: string
  initial_grams: number
  current_grams: number
  cost_per_gram: number | null
  price_per_gram: number
  lot_date: string
  supplier_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface CommercialProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  price_basico: number
  price_no_delega: number | null
  price_administrativo: number | null
  price_autoridad: number | null
  stock_quantity: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface ExchangeRate {
  id: string
  rate_date: string
  usd_to_ars: number
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface Sale {
  id: string
  product_id: string | null
  member_id: string | null
  quantity: number
  unit_price: number
  total: number
  payment_method: PaymentMethod | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface CashRegister {
  id: string
  register_date: string
  expected_total: number
  actual_total: number | null
  difference: number | null
  status: CashRegisterStatus
  closed_by: string | null
  closed_at: string | null
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface Payment {
  id: string
  member_id: string
  amount_ars: number
  amount_usd: number | null
  currency: Currency
  exchange_rate_id: string | null
  concept: PaymentConcept
  payment_method: PaymentMethod | null
  billing_description: string | null
  billing_from: string | null
  billing_to: string | null
  is_billable: boolean
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface Supplier {
  id: string
  name: string
  type: SupplierType | null
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface SupplyRecord {
  id: string
  supplier_id: string
  description: string
  quantity: number | null
  unit_cost: number | null
  total_cost: number | null
  impacts_stock: 'medicinal' | 'comercial' | 'ninguno' | null
  lot_id: string | null
  product_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface Event {
  id: string
  name: string
  description: string | null
  event_date: string
  location: string | null
  total_cost: number
  total_income: number
  status: EventStatus
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface EventAttendee {
  id: string
  event_id: string
  member_id: string
  attended: boolean
  notes: string | null
  created_at: string
}

export interface EnrollmentRequest {
  id: string
  first_name: string
  last_name: string
  dni: string
  cuit: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  reprocann_status: string | null
  reprocann_number: string | null
  cultivador: string | null
  domicilio_cultivo: string | null
  additional_info: string | null
  status: EnrollmentStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  created_by: string | null
}

export interface AppConfig {
  key: string
  value: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}

// Type alias para uso en queries
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      members: { Row: Member; Insert: Partial<Member>; Update: Partial<Member> }
      dispensations: { Row: Dispensation; Insert: Partial<Dispensation>; Update: never }
      member_condition_history: { Row: MemberConditionHistory; Insert: Partial<MemberConditionHistory>; Update: never }
      medical_stock_lots: { Row: MedicalStockLot; Insert: Partial<MedicalStockLot>; Update: Partial<MedicalStockLot> }
      commercial_products: { Row: CommercialProduct; Insert: Partial<CommercialProduct>; Update: Partial<CommercialProduct> }
      exchange_rates: { Row: ExchangeRate; Insert: Partial<ExchangeRate>; Update: never }
      sales: { Row: Sale; Insert: Partial<Sale>; Update: Partial<Sale> }
      cash_registers: { Row: CashRegister; Insert: Partial<CashRegister>; Update: Partial<CashRegister> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> }
      supply_records: { Row: SupplyRecord; Insert: Partial<SupplyRecord>; Update: Partial<SupplyRecord> }
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> }
      event_attendees: { Row: EventAttendee; Insert: Partial<EventAttendee>; Update: Partial<EventAttendee> }
      enrollment_requests: { Row: EnrollmentRequest; Insert: Partial<EnrollmentRequest>; Update: Partial<EnrollmentRequest> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: never }
      app_config: { Row: AppConfig; Insert: Partial<AppConfig>; Update: Partial<AppConfig> }
    }
  }
}
