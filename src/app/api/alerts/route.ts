import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/alerts
// Header: x-alerts-secret: <ALERTS_SECRET env var>
// Returns: all pending alerts grouped by category
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-alerts-secret')
  if (!secret || secret !== process.env.ALERTS_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in30days = new Date(today)
  in30days.setDate(in30days.getDate() + 30)
  const in30daysStr = in30days.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const ago35days = new Date(today)
  ago35days.setDate(ago35days.getDate() - 35)

  // --- Auto-expire REPROCANN vencidos (side effect) ---
  await admin
    .from('members')
    .update({ reprocann_status: 'vencido', updated_at: new Date().toISOString() })
    .lt('reprocann_expiry', todayStr)
    .not('reprocann_status', 'in', '(vencido,cancelado)')
    .eq('is_deleted', false)

  // --- 1. REPROCANN por vencer (próximos 30 días) ---
  const { data: reprocannProximos } = await admin
    .from('members')
    .select('id, member_number, first_name, last_name, reprocann_expiry, reprocann_number')
    .eq('reprocann_status', 'activo')
    .eq('is_deleted', false)
    .gte('reprocann_expiry', todayStr)
    .lte('reprocann_expiry', in30daysStr)
    .order('reprocann_expiry', { ascending: true })

  // --- 2. Stock medicinal bajo (< 100g por lote) ---
  const { data: stockMedicinalBajo } = await admin
    .from('medical_stock_lots')
    .select('id, genetics, current_grams, lot_date')
    .eq('is_deleted', false)
    .lt('current_grams', 100)
    .gt('current_grams', 0)
    .order('current_grams', { ascending: true })

  // --- 3. Stock comercial bajo (stock_quantity <= low_stock_threshold) ---
  const { data: allProducts } = await admin
    .from('commercial_products')
    .select('id, name, stock_quantity, low_stock_threshold')
    .eq('is_deleted', false)
    .gt('low_stock_threshold', 0)

  const stockComercialBajo = (allProducts ?? []).filter(
    p => p.stock_quantity <= p.low_stock_threshold
  )

  // --- 4. Diferencias en caja (últimas 48h, cerradas con diferencia != 0) ---
  const { data: diferenciasRaw } = await admin
    .from('cash_registers')
    .select('id, register_date, expected_total, actual_total, difference, notes')
    .eq('status', 'cerrada')
    .neq('difference', 0)
    .gte('register_date', yesterdayStr)
    .order('register_date', { ascending: false })

  const diferencias = (diferenciasRaw ?? []).filter(r => r.difference !== null && r.difference !== 0)

  // --- 5. Nuevas solicitudes pendientes (últimas 48h) ---
  const { data: nuevasSolicitudes } = await admin
    .from('enrollment_requests')
    .select('id, first_name, last_name, dni, created_at')
    .eq('status', 'pendiente')
    .gte('created_at', `${yesterdayStr}T00:00:00`)
    .order('created_at', { ascending: false })

  // --- 6. Cuotas pendientes (socios con membership_fee > 0 sin pago en 35 días) ---
  const { data: membersConCuota } = await admin
    .from('members')
    .select('id, member_number, first_name, last_name, membership_fee')
    .eq('is_deleted', false)
    .gt('membership_fee', 0)

  let cuotasPendientes: typeof membersConCuota = []
  if (membersConCuota && membersConCuota.length > 0) {
    const memberIds = membersConCuota.map(m => m.id)
    const { data: recentPayments } = await admin
      .from('payments')
      .select('member_id')
      .in('member_id', memberIds)
      .eq('is_deleted', false)
      .gte('created_at', ago35days.toISOString())

    const paidMemberIds = new Set((recentPayments ?? []).map(p => p.member_id))
    cuotasPendientes = membersConCuota.filter(m => !paidMemberIds.has(m.id))
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    reprocann_proximos: reprocannProximos ?? [],
    stock_medicinal_bajo: stockMedicinalBajo ?? [],
    stock_comercial_bajo: stockComercialBajo,
    diferencias_caja: diferencias,
    nuevas_solicitudes: nuevasSolicitudes ?? [],
    cuotas_pendientes: cuotasPendientes ?? [],
  })
}
