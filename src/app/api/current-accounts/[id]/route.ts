import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/current-accounts/[id] — detalle + movimientos paginados
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
  const from = searchParams.get('from') ?? null
  const to = searchParams.get('to') ?? null
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  // Obtener cuenta con entidad
  const { data: account, error: accountError } = await admin
    .from('current_accounts')
    .select(`
      *,
      members!current_accounts_member_id_fkey(first_name, last_name, member_number),
      suppliers!current_accounts_supplier_id_fkey(name)
    `)
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  // Query de movimientos con filtros de fecha
  let movQuery = admin
    .from('current_account_movements')
    .select(`*, profiles!current_account_movements_created_by_fkey(full_name)`, { count: 'exact' })
    .eq('account_id', params.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (from) movQuery = movQuery.gte('created_at', from)
  if (to)   movQuery = movQuery.lte('created_at', to + 'T23:59:59')

  const { data: movements, count, error: movError } = await movQuery

  if (movError) {
    console.error('movements GET error:', movError.code)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }

  // Summary del período
  let summaryQuery = admin
    .from('current_account_movements')
    .select('movement_type, amount')
    .eq('account_id', params.id)

  if (from) summaryQuery = summaryQuery.gte('created_at', from)
  if (to)   summaryQuery = summaryQuery.lte('created_at', to + 'T23:59:59')

  const { data: allMovements } = await summaryQuery

  const summary = (allMovements ?? []).reduce(
    (acc, m) => {
      if (m.movement_type === 'credito') acc.total_creditos += Number(m.amount)
      else acc.total_debitos += Number(m.amount)
      acc.movement_count++
      return acc
    },
    { total_creditos: 0, total_debitos: 0, movement_count: 0 }
  )

  // Mapear account
  const member = (account as Record<string, unknown>).members as { first_name: string; last_name: string; member_number: string } | null
  const supplier = (account as Record<string, unknown>).suppliers as { name: string } | null

  const mappedAccount = {
    ...account,
    members: undefined,
    suppliers: undefined,
    entity_name:
      account.entity_type === 'socio'
        ? member ? `${member.first_name} ${member.last_name}` : ''
        : supplier?.name ?? '',
    entity_number: account.entity_type === 'socio' ? member?.member_number ?? null : null,
  }

  // Mapear movimientos
  const mappedMovements = (movements ?? []).map((m: Record<string, unknown>) => {
    const profile = m.profiles as { full_name: string } | null
    return { ...m, profiles: undefined, created_by_name: profile?.full_name ?? null }
  })

  const total = count ?? 0

  return NextResponse.json({
    data: {
      account: mappedAccount,
      movements: mappedMovements,
      summary,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    },
  })
}
