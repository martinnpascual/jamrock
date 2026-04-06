import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/members/verify?qr=SOC-0001 o ?dni=12345678
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const qr = searchParams.get('qr')
  const dni = searchParams.get('dni')
  const memberId = searchParams.get('id')

  if (!qr && !dni && !memberId) {
    return NextResponse.json({ error: 'qr, dni o id requerido' }, { status: 400 })
  }

  // Buscar socio
  let query = supabase.from('members').select('*').eq('is_deleted', false)

  if (qr) {
    // Busca por qr_code primero, luego por member_number como fallback
    const { data: byQr } = await supabase.from('members').select('*').eq('is_deleted', false).eq('qr_code', qr).single()
    if (byQr) {
      query = supabase.from('members').select('*').eq('is_deleted', false).eq('id', byQr.id)
    } else {
      query = query.eq('member_number', qr)
    }
  } else if (dni) query = query.eq('dni', dni)
  else if (memberId) query = query.eq('id', memberId)

  const { data: member, error } = await query.single()

  if (error || !member) {
    return NextResponse.json({ found: false, error: 'Socio no encontrado' }, { status: 404 })
  }

  // Verificar si puede dispensar
  const { data: verifyResult } = await supabase
    .rpc('can_member_dispense', { p_member_id: member.id })

  const verification = verifyResult as { allowed: boolean; reason: string | null } | null

  // Dispensas del mes actual
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthDispensations } = await supabase
    .from('dispensations')
    .select('quantity_grams, created_at, dispensation_number')
    .eq('member_id', member.id)
    .eq('type', 'normal')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false })

  const monthTotal = monthDispensations?.reduce((sum, d) => sum + (d.quantity_grams ?? 0), 0) ?? 0

  return NextResponse.json({
    found: true,
    member: {
      id: member.id,
      member_number: member.member_number,
      first_name: member.first_name,
      last_name: member.last_name,
      dni: member.dni,
      reprocann_status: member.reprocann_status,
      reprocann_expiry: member.reprocann_expiry,
      qr_code: member.qr_code,
    },
    verification: {
      allowed: verification?.allowed ?? false,
      reason: verification?.reason ?? null,
    },
    month_stats: {
      total_grams: monthTotal,
      dispensation_count: monthDispensations?.length ?? 0,
      last_dispensation: monthDispensations?.[0] ?? null,
    },
  })
}
