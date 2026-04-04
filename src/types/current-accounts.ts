export interface CurrentAccount {
  id: string
  account_number: string
  entity_type: 'socio' | 'proveedor'
  member_id: string | null
  supplier_id: string | null
  balance: number
  credit_limit: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  // joined
  entity_name?: string
  entity_number?: string | null
  last_movement_at?: string | null
}

export interface CurrentAccountMovement {
  id: string
  movement_number: string
  account_id: string
  movement_type: 'credito' | 'debito'
  amount: number
  balance_after: number
  concept: string
  description: string | null
  source_type: 'payment' | 'supply_record' | 'sale' | 'manual' | 'adjustment' | 'reversal' | null
  source_id: string | null
  reverses_id: string | null
  created_at: string
  created_by: string | null
  // joined
  created_by_name?: string | null
}

export interface AccountStatement {
  account: CurrentAccount
  movements: CurrentAccountMovement[]
  summary: {
    total_creditos: number
    total_debitos: number
    movement_count: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface AccountFilters {
  entity_type?: 'socio' | 'proveedor'
  search?: string
  balance_status?: 'positive' | 'negative' | 'zero'
}
