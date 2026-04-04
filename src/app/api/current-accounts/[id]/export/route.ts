import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/current-accounts/[id]/export — exportar CSV
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
  const from = searchParams.get('from') ?? null
  const to = searchParams.get('to') ?? null

  const admin = createAdminClient()

  // Obtener nombre de la cuenta para el nombre del archivo
  const { data: account } = await admin
    .from('current_accounts')
    .select(`
      account_number, entity_type,
      members!current_accounts_member_id_fkey(first_name, last_name),
      suppliers!current_accounts_supplier_id_fkey(name)
    `)
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  let movQuery = admin
    .from('current_account_movements')
    .select(`*, profiles!current_account_movements_created_by_fkey(full_name)`)
    .eq('account_id', params.id)
    .order('created_at', { ascending: true })

  if (from) movQuery = movQuery.gte('created_at', from)
  if (to)   movQuery = movQuery.lte('created_at', to + 'T23:59:59')

  const { data: movements, error } = await movQuery

  if (error) {
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }

  // Generar CSV
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const formatAmount = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const header = ['Fecha', 'Nro Movimiento', 'Concepto', 'Descripción', 'Debe', 'Haber', 'Saldo', 'Operador']

  const rows = (movements ?? []).map((m: Record<string, unknown>) => {
    const profile = m.profiles as { full_name: string } | null
    const debe  = m.movement_type === 'debito'  ? formatAmount(Number(m.amount)) : ''
    const haber = m.movement_type === 'credito' ? formatAmount(Number(m.amount)) : ''
    return [
      formatDate(m.created_at as string),
      m.movement_number,
      m.concept,
      m.description ?? '',
      debe,
      haber,
      formatAmount(Number(m.balance_after)),
      profile?.full_name ?? '',
    ]
  })

  const csvEscape = (val: unknown) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const csvContent = [
    header.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ].join('\r\n')

  const member = (account as Record<string, unknown>).members as { first_name: string; last_name: string } | null
  const supplier = (account as Record<string, unknown>).suppliers as { name: string } | null
  const entityName = account.entity_type === 'socio'
    ? (member ? `${member.first_name}_${member.last_name}` : 'socio')
    : (supplier?.name ?? 'proveedor')

  const filename = `CC_${account.account_number}_${entityName}_${new Date().toISOString().slice(0,10)}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
