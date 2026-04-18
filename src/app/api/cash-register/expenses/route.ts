import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { logActivity, getUserName } from '@/lib/audit'

const CATEGORIES = ['sueldo', 'limpieza', 'servicios', 'alquiler', 'mantenimiento', 'compras', 'retiro', 'otro'] as const

const expenseSchema = z.object({
  category:    z.enum(CATEGORIES),
  description: z.string().min(2, 'Descripción requerida').max(200),
  amount:      z.number().positive('El monto debe ser mayor a 0'),
  notes:       z.string().max(500).optional(),
})

// GET — egresos del día (o por fecha)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const admin = createAdminClient()
  const { data: expenses, error } = await admin
    .from('cash_register_expenses')
    .select('*, profiles:created_by(full_name)')
    .eq('is_deleted', false)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener egresos' }, { status: 500 })

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
  return NextResponse.json({ expenses: expenses ?? [], total })
}

// POST — registrar egreso
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede registrar egresos' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Buscar caja abierta del día (opcional)
  const { data: openReg } = await admin
    .from('cash_registers')
    .select('id')
    .eq('register_date', today)
    .eq('status', 'abierta')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: expense, error } = await admin
    .from('cash_register_expenses')
    .insert({
      register_id:  openReg?.id ?? null,
      category:     parsed.data.category,
      description:  parsed.data.description,
      amount:       parsed.data.amount,
      notes:        parsed.data.notes ?? null,
      created_by:   user.id,
    })
    .select('id, category, description, amount, created_at')
    .single()

  if (error || !expense) {
    return NextResponse.json({ error: 'Error al registrar egreso' }, { status: 500 })
  }

  // Auditoría
  const userName = await getUserName(supabase, user.id)
  await logActivity({
    admin,
    userId: user.id,
    userName,
    action: 'crear',
    entity: 'egreso_caja',
    entityId: expense.id,
    description: `Egreso de caja: ${parsed.data.category} — ${parsed.data.description} — $${parsed.data.amount}`,
    metadata: { ...parsed.data },
  })

  return NextResponse.json({ expense }, { status: 201 })
}

// DELETE — soft delete
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede eliminar egresos' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('cash_register_expenses')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al eliminar egreso' }, { status: 500 })

  return NextResponse.json({ success: true })
}
