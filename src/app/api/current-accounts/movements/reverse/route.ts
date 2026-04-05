import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reverseMovementSchema } from '@/lib/validations/current-accounts'

// POST /api/current-accounts/movements/reverse — solo gerente
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede revertir movimientos' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = reverseMovementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  // Usar supabase (cookie auth) para lecturas — RLS gerente cubre
  const { data: original } = await supabase
    .from('current_account_movements')
    .select('*')
    .eq('id', parsed.data.movement_id)
    .maybeSingle()

  if (!original) {
    return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
  }

  const { data: existingReversal } = await supabase
    .from('current_account_movements')
    .select('id')
    .eq('reverses_id', original.id)
    .maybeSingle()

  if (existingReversal) {
    return NextResponse.json({ error: 'Este movimiento ya fue revertido' }, { status: 409 })
  }

  const reversal_type = original.movement_type === 'credito' ? 'debito' : 'credito'

  // Admin solo para INSERT
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('current_account_movements')
    .insert({
      account_id: original.account_id,
      movement_type: reversal_type,
      amount: original.amount,
      balance_after: 0, // calculado por trigger
      concept: 'reversal',
      description: `Reversión de ${original.movement_number} — ${parsed.data.reason}`,
      source_type: 'reversal',
      source_id: original.id,
      reverses_id: original.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('reverse POST error:', error.code, error.message)
    if (error.message?.includes('límite de crédito')) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Error al revertir movimiento' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
