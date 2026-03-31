import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — caja del día (o la más reciente)
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  const { data: register } = await admin.from('cash_registers')
    .select('*').eq('register_date', today).single()

  // Totales del día
  const [salesRes, paymentsRes] = await Promise.all([
    admin.from('sales').select('total, payment_method')
      .eq('is_deleted', false).gte('created_at', `${today}T00:00:00`),
    admin.from('payments').select('amount, payment_method')
      .eq('is_deleted', false).gte('created_at', `${today}T00:00:00`),
  ])

  const salesTotal = (salesRes.data ?? []).reduce((s, r) => s + r.total, 0)
  const paymentsTotal = (paymentsRes.data ?? []).reduce((s, r) => s + r.amount, 0)
  const expectedTotal = salesTotal + paymentsTotal

  return NextResponse.json({
    register: register ?? null,
    today,
    stats: {
      sales_total: salesTotal,
      payments_total: paymentsTotal,
      expected_total: expectedTotal,
      sales_count: (salesRes.data ?? []).length,
      payments_count: (paymentsRes.data ?? []).length,
    },
  })
}

// POST — abrir caja del día
export async function POST() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  const { data: existing } = await admin.from('cash_registers').select('id').eq('register_date', today).single()
  if (existing) return NextResponse.json({ error: 'Ya existe una caja abierta para hoy' }, { status: 422 })

  const { data, error } = await admin.from('cash_registers').insert({
    register_date: today,
    expected_total: 0,
    status: 'abierta',
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Error al abrir caja' }, { status: 500 })
  return NextResponse.json({ register: data }, { status: 201 })
}

// PATCH — cerrar caja con monto real
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede cerrar la caja' }, { status: 403 })
  }

  let body: { id: string; actual_total: number; notes?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body.id || body.actual_total === undefined) {
    return NextResponse.json({ error: 'id y actual_total requeridos' }, { status: 400 })
  }

  // Calcular expected_total en el momento del cierre
  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  const [salesRes, paymentsRes] = await Promise.all([
    admin.from('sales').select('total').eq('is_deleted', false).gte('created_at', `${today}T00:00:00`),
    admin.from('payments').select('amount').eq('is_deleted', false).gte('created_at', `${today}T00:00:00`),
  ])

  const expectedTotal =
    (salesRes.data ?? []).reduce((s, r) => s + r.total, 0) +
    (paymentsRes.data ?? []).reduce((s, r) => s + r.amount, 0)

  const difference = body.actual_total - expectedTotal

  const { data, error } = await admin.from('cash_registers').update({
    status: 'cerrada',
    expected_total: expectedTotal,
    actual_total: body.actual_total,
    difference,
    notes: body.notes ?? null,
    closed_by: user.id,
    closed_at: new Date().toISOString(),
  }).eq('id', body.id).select().single()

  if (error) return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 })
  return NextResponse.json({ register: data })
}
