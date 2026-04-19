import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const ALLOWED_KEYS = [
  'club_name',
  'club_address',
  'default_membership_fee',
  'max_grams_per_dispensa',
  'club_phone',
] as const

// GET — público (solo requiere sesión activa)
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('app_config')
    .select('key, value, updated_at')
    .in('key', ALLOWED_KEYS)

  if (error) {
    return NextResponse.json({ error: 'Error al leer configuración' }, { status: 500 })
  }

  // Convertir array de filas a mapa key→value
  const config = Object.fromEntries((data ?? []).map((row) => [row.key, String(row.value ?? '')]))

  return NextResponse.json({ config })
}

const saveSchema = z.object({
  updates: z.record(z.string(), z.string()),
})

// POST — solo gerente
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

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede editar la configuración' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
  }

  const { updates } = parsed.data

  // Filtrar solo claves permitidas
  const validEntries = Object.entries(updates).filter(([key]) =>
    (ALLOWED_KEYS as readonly string[]).includes(key)
  )

  if (validEntries.length === 0) {
    return NextResponse.json({ error: 'Sin claves válidas para actualizar' }, { status: 422 })
  }

  const admin = createAdminClient()
  const rows = validEntries.map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }))

  const { error: upsertError } = await admin
    .from('app_config')
    .upsert(rows, { onConflict: 'key' })

  if (upsertError) {
    console.error('Error upserting app_config:', upsertError.code)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
