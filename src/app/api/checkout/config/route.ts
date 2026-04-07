/**
 * GET  /api/checkout/config  — Lee configuración de checkout
 * PUT  /api/checkout/config  — Actualiza configuración (solo gerente)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkoutConfigSchema } from '@/lib/validations/checkout'

const CONFIG_KEYS = [
  'dispensation_price_per_gram',
  'checkout_allow_credit',
  'checkout_show_cc_balance',
] as const

export async function GET() {
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

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('app_config')
    .select('key, value')
    .in('key', CONFIG_KEYS)

  if (error) {
    return NextResponse.json({ error: 'Error al leer configuración' }, { status: 500 })
  }

  // Convertir array a objeto y dar valores por defecto
  const config: Record<string, unknown> = {
    dispensation_price_per_gram: { enabled: false, price: 0 },
    checkout_allow_credit:       { enabled: true },
    checkout_show_cc_balance:    { enabled: true },
  }
  for (const row of rows ?? []) {
    config[row.key] = row.value
  }

  return NextResponse.json({ config })
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede modificar la configuración' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = checkoutConfigSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const admin = createAdminClient()
  const updates: Promise<unknown>[] = []

  if (parsed.data.dispensation_price_per_gram !== undefined) {
    updates.push(
      admin.from('app_config').upsert({
        key:        'dispensation_price_per_gram',
        value:      parsed.data.dispensation_price_per_gram,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
    )
  }
  if (parsed.data.checkout_allow_credit !== undefined) {
    updates.push(
      admin.from('app_config').upsert({
        key:        'checkout_allow_credit',
        value:      parsed.data.checkout_allow_credit,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
    )
  }
  if (parsed.data.checkout_show_cc_balance !== undefined) {
    updates.push(
      admin.from('app_config').upsert({
        key:        'checkout_show_cc_balance',
        value:      parsed.data.checkout_show_cc_balance,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
    )
  }

  const results = await Promise.all(updates)
  const hasError = results.some((r: unknown) => (r as { error?: unknown }).error)

  if (hasError) {
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
