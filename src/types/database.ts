export type UserRole = 'gerente' | 'secretaria' | 'cultivador'
export type ReprocannStatus = 'activo' | 'en_tramite' | 'vencido' | 'cancelado'
export type MemberType = 'standard' | 'therapeutic' | 'honorary'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto'
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
  email: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  member_type: MemberType
  membership_fee: number | null
  reprocann_status: ReprocannStatus
  reprocann_expiry: string | null
  reprocann_number: string | null
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
  created_at: string
  created_by: string | null
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
  price: number
  stock_quantity: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
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
  amount: number
  concept: string
  payment_method: PaymentMethod | null
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
  email: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  reprocann_status: string | null
  reprocann_number: string | null
  additional_info: string | null
  status: EnrollmentStatus
  rejection_reason: string | null
  missing_info: string | null
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
      medical_stock_lots: { Row: MedicalStockLot; Insert: Partial<MedicalStockLot>; Update: Partial<MedicalStockLot> }
      commercial_products: { Row: CommercialProduct; Insert: Partial<CommercialProduct>; Update: Partial<CommercialProduct> }
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
