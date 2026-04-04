import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMovementSchema } from '@/lib/validations/current-accounts'

// POST /api/current-accounts/movements — movimiento manual
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = createMovementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()

  // Verificar cuenta
  const { data: account } = await admin
    .from('current_accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ error: 'Cuenta corriente no encontrada' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('current_account_movements')
    .insert({
      account_id: parsed.data.account_id,
      movement_type: parsed.data.movement_type,
      amount: parsed.data.amount,
      balance_after: 0, // calculado por trigger
      concept: parsed.data.concept,
      description: parsed.data.description || null,
      source_type: 'manual',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('movement POST error:', error.code, error.message)
    // Exponer mensaje de crédito si viene del trigger
    if (error.message?.includes('límite de crédito')) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
