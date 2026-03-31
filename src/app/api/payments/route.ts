import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentSchema } from '@/lib/validations/payment'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para registrar pagos' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { member_id, amount, concept, payment_method, notes } = parsed.data

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .insert({
      member_id,
      amount,
      concept,
      payment_method,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('payment insert error:', error.code)
    return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
  }

  return NextResponse.json({ payment: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede anular pagos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('payments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al anular pago' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
