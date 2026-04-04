import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAccountSchema, accountFiltersSchema } from '@/lib/validations/current-accounts'

// GET /api/current-accounts — lista cuentas con filtros
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filters = accountFiltersSchema.safeParse({
    entity_type: searchParams.get('entity_type') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    balance_status: searchParams.get('balance_status') ?? undefined,
  })

  const admin = createAdminClient()

  let query = admin
    .from('current_accounts')
    .select(`
      *,
      members!current_accounts_member_id_fkey(first_name, last_name, member_number),
      suppliers!current_accounts_supplier_id_fkey(name),
      current_account_movements(created_at)
    `)
    .eq('is_deleted', false)
    .order('balance', { ascending: true })

  if (filters.success) {
    const { entity_type, balance_status } = filters.data
    if (entity_type) query = query.eq('entity_type', entity_type)
    if (balance_status === 'positive') query = query.gt('balance', 0)
    else if (balance_status === 'negative') query = query.lt('balance', 0)
    else if (balance_status === 'zero') query = query.eq('balance', 0)
  }

  const { data, error } = await query

  if (error) {
    console.error('current-accounts GET error:', error.code)
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 })
  }

  // Mapear a formato limpio con entity_name
  const accounts = (data ?? []).map((row: Record<string, unknown>) => {
    const member = row.members as { first_name: string; last_name: string; member_number: string } | null
    const supplier = row.suppliers as { name: string } | null
    const movements = (row.current_account_movements as { created_at: string }[]) ?? []

    const entity_name =
      row.entity_type === 'socio'
        ? member ? `${member.first_name} ${member.last_name}` : ''
        : supplier?.name ?? ''

    const entity_number = row.entity_type === 'socio' ? member?.member_number ?? null : null

    const last_movement_at =
      movements.length > 0
        ? movements.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
        : null

    const search = (filters.success && filters.data.search?.toLowerCase()) || ''
    if (search && !entity_name.toLowerCase().includes(search)) return null

    return {
      ...row,
      members: undefined,
      suppliers: undefined,
      current_account_movements: undefined,
      entity_name,
      entity_number,
      last_movement_at,
    }
  }).filter(Boolean)

  return NextResponse.json({ data: accounts })
}

// POST /api/current-accounts — crear cuenta manualmente
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

  const parsed = createAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const admin = createAdminClient()

  // Verificar que no exista ya una CC activa para esta entidad
  const checkQuery = parsed.data.entity_type === 'socio'
    ? admin.from('current_accounts').select('id').eq('member_id', parsed.data.member_id!).eq('is_deleted', false)
    : admin.from('current_accounts').select('id').eq('supplier_id', parsed.data.supplier_id!).eq('is_deleted', false)

  const { data: existing } = await checkQuery.maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Ya existe una cuenta corriente activa para esta entidad' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('current_accounts')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('current-accounts POST error:', error.code)
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
