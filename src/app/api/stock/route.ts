import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stockLotSchema } from '@/lib/validations/stock'
import { logActivity, getUserName } from '@/lib/audit'

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

  const {
    genetics, initial_grams, cost_per_gram, price_per_gram, lot_date, notes,
    is_outsourced, outsourced_provider_name, cost_total, sale_price_total,
  } = parsed.data

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('medical_stock_lots')
    .insert({
      genetics,
      initial_grams,
      current_grams: initial_grams,
      cost_per_gram: cost_per_gram ?? null,
      price_per_gram: price_per_gram ?? 0,
      lot_date: lot_date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      is_outsourced: is_outsourced ?? false,
      outsourced_provider_name: is_outsourced ? (outsourced_provider_name ?? null) : null,
      cost_total: is_outsourced ? (cost_total ?? null) : null,
      sale_price_total: is_outsourced ? (sale_price_total ?? null) : null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('stock lot insert error:', error.code)
    return NextResponse.json({ error: 'Error al registrar lote' }, { status: 500 })
  }

  const userName = await getUserName(supabase, user.id)
  await logActivity({
    admin, userId: user.id, userName,
    action: 'crear', entity: 'stock', entityId: data.id,
    description: `Ingresó lote de ${data.genetics} — ${data.initial_grams}g a $${data.price_per_gram}/g`,
    metadata: { genetics: data.genetics, grams: data.initial_grams, price_per_gram: data.price_per_gram },
  })

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

  // Fetch lot data before soft-deleting (for audit log)
  const { data: lot } = await admin
    .from('medical_stock_lots')
    .select('genetics, current_grams')
    .eq('id', id)
    .single()

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

  if (lot) {
    const userName = await getUserName(supabase, user.id)
    await logActivity({
      admin, userId: user.id, userName,
      action: 'eliminar', entity: 'stock', entityId: id,
      description: `Eliminó lote de ${lot.genetics} (${lot.current_grams}g restantes)`,
      metadata: { genetics: lot.genetics, remaining: lot.current_grams },
    })
  }

  return NextResponse.json({ ok: true })
}
