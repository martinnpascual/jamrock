import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — cajas del día (0, 1 o 2 por turnos)
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para ver caja' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  // Obtener TODAS las cajas del día (puede haber 0, 1 o 2)
  const { data: registers } = await admin.from('cash_registers')
    .select('*').eq('register_date', today).order('created_at', { ascending: true })

  const allRegisters = registers ?? []
  const morning = allRegisters.find(r => r.shift === 'mañana') ?? null
  const afternoon = allRegisters.find(r => r.shift === 'tarde') ?? null
  const openRegister = allRegisters.find(r => r.status === 'abierta') ?? null

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

  // Calcular totales por turno
  const totalExpected = allRegisters.reduce((s, r) => s + Number(r.expected_total ?? 0), 0)
  const totalActual = allRegisters.every(r => r.actual_total !== null)
    ? allRegisters.reduce((s, r) => s + Number(r.actual_total ?? 0), 0)
    : null
  const totalDifference = totalActual !== null
    ? allRegisters.reduce((s, r) => s + Number(r.difference ?? 0), 0)
    : null

  return NextResponse.json({
    registers: allRegisters,
    today,
    stats: {
      sales_total: salesTotal,
      payments_total: paymentsTotal,
      expected_total: expectedTotal,
      sales_count: (salesRes.data ?? []).length,
      payments_count: (paymentsRes.data ?? []).length,
    },
    summary: {
      has_open: !!openRegister,
      open_shift: openRegister?.shift ?? null,
      morning,
      afternoon,
      total_expected: totalExpected,
      total_actual: totalActual,
      total_difference: totalDifference,
    },
  })
}

// POST — abrir caja con turno
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: { shift?: string }
  try { body = await request.json() } catch { body = {} }

  const shift = body.shift ?? 'mañana'
  if (!['mañana', 'tarde'].includes(shift)) {
    return NextResponse.json({ error: 'Turno inválido. Debe ser "mañana" o "tarde"' }, { status: 422 })
  }

  const today = new Date().toISOString().split('T')[0]
  const admin = createAdminClient()

  // Verificar que no exista ya una caja para este turno+fecha
  const { data: existing } = await admin.from('cash_registers')
    .select('id').eq('register_date', today).eq('shift', shift).single()

  if (existing) {
    return NextResponse.json({ error: `Ya existe una caja para el turno ${shift} del día ${today}` }, { status: 422 })
  }

  const { data, error } = await admin.from('cash_registers').insert({
    register_date: today,
    shift,
    expected_total: 0,
    status: 'abierta',
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Error al abrir caja' }, { status: 500 })
  return NextResponse.json({ register: data }, { status: 201 })
}

// PATCH — cerrar caja de un turno
export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede cerrar la caja' }, { status: 403 })
  }

  let body: { id: string; actual_total: number; notes?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body.id || body.actual_total === undefined) {
    return NextResponse.json({ error: 'id y actual_total requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Obtener la caja a cerrar
  const { data: register, error: regErr } = await admin.from('cash_registers')
    .select('*').eq('id', body.id).single()

  if (regErr || !register) {
    return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 })
  }

  if (register.status === 'cerrada') {
    return NextResponse.json({ error: `La caja del turno ${register.shift} ya fue cerrada` }, { status: 422 })
  }

  const difference = body.actual_total - Number(register.expected_total)

  const { data, error } = await admin.from('cash_registers').update({
    status: 'cerrada',
    actual_total: body.actual_total,
    difference,
    notes: body.notes ?? null,
    closed_by: user.id,
    closed_at: new Date().toISOString(),
  }).eq('id', body.id).select().single()

  if (error) return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 })
  return NextResponse.json({ register: data })
}
