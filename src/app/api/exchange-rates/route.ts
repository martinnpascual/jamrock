import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const exchangeRateSchema = z.object({
  rate_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  usd_to_ars: z.coerce.number().positive('El tipo de cambio debe ser mayor a 0'),
  notes:      z.string().max(500).optional(),
})

// GET /api/exchange-rates — últimos 30 registros + el del día si existe
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('exchange_rates')
    .select('id, rate_date, usd_to_ars, notes, created_at, created_by')
    .order('rate_date', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener tipos de cambio' }, { status: 500 })
  }

  return NextResponse.json({ exchange_rates: data ?? [] })
}

// POST /api/exchange-rates — crear o actualizar el tipo de cambio de un día
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

  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para registrar tipo de cambio' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = exchangeRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { rate_date, usd_to_ars, notes } = parsed.data
  const admin = createAdminClient()

  // Upsert por date (rate_date tiene constraint UNIQUE)
  const { data, error } = await admin
    .from('exchange_rates')
    .upsert(
      { rate_date, usd_to_ars, notes: notes ?? null, created_by: user.id },
      { onConflict: 'rate_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('exchange-rates POST error:', error.code)
    return NextResponse.json({ error: 'Error al guardar tipo de cambio' }, { status: 500 })
  }

  return NextResponse.json({ exchange_rate: data }, { status: 201 })
}
