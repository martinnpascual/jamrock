import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stockLotSchema } from '@/lib/validations/stock'

// POST — crear nuevo lote de stock medicinal
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

  if (!profile || !['gerente', 'cultivador'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para gestionar stock' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = stockLotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { genetics, initial_grams, cost_per_gram, price_per_gram, lot_date, notes } = parsed.data

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('medical_stock_lots')
    .insert({
      genetics,
      initial_grams,
      current_grams: initial_grams, // arranca lleno
      cost_per_gram: cost_per_gram ?? null,
      price_per_gram: price_per_gram ?? 0,
      lot_date: lot_date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('stock lot insert error:', error.code)
    return NextResponse.json({ error: 'Error al registrar lote' }, { status: 500 })
  }

  return NextResponse.json({ lot: data }, { status: 201 })
}

// DELETE (soft) — dar de baja un lote
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
    return NextResponse.json({ error: 'Solo el gerente puede dar de baja lotes' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('medical_stock_lots')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al dar de baja lote' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
