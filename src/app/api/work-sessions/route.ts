import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST — crear sesión (login)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar que tenga perfil (solo operadores del sistema)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const admin = createAdminClient()

  // Cerrar cualquier sesión abierta previa (por si hubo un cierre abrupto)
  await admin
    .from('work_sessions')
    .update({ logout_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('logout_at', null)
    .eq('is_deleted', false)

  // Crear nueva sesión
  const { data, error } = await admin
    .from('work_sessions')
    .insert({ user_id: user.id, login_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al registrar sesión' }, { status: 500 })
  }

  return NextResponse.json({ session: data }, { status: 201 })
}

// PATCH — cerrar sesión (logout)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  await admin
    .from('work_sessions')
    .update({ logout_at: now })
    .eq('user_id', user.id)
    .is('logout_at', null)
    .eq('is_deleted', false)

  return NextResponse.json({ ok: true })
}

// GET — listar sesiones (gerente only)
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Solo el gerente puede ver todas las sesiones' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // formato: YYYY-MM
  const userId = searchParams.get('user_id')

  const admin = createAdminClient()
  const firstOfMonth = month ? `${month}-01T00:00:00` : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const [year, mon] = (month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-').map(Number)
  const lastOfMonth = new Date(year, mon, 0, 23, 59, 59).toISOString()

  let query = admin
    .from('work_sessions')
    .select('*')
    .eq('is_deleted', false)
    .gte('login_at', firstOfMonth)
    .lte('login_at', lastOfMonth)
    .order('login_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: sessions, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Error al cargar sesiones' }, { status: 500 })
  }

  // Get profiles for the users in sessions
  const seen = new Set<string>()
  const userIds = (sessions ?? []).map((s) => s.user_id).filter((id) => {
    if (seen.has(id)) return false
    seen.add(id); return true
  })
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .in('id', userIds)

  return NextResponse.json({ sessions: sessions ?? [], profiles: profiles ?? [] })
}
