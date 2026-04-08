import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — listar operadores del sistema
export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo gerentes pueden ver operadores' }, { status: 403 })
  }

  const { data: operators, error } = await admin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ operators: operators ?? [] })
}

// PATCH — activar / desactivar operador
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo gerentes pueden modificar operadores' }, { status: 403 })
  }

  const { id, is_active } = await request.json()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id) || typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'No podés desactivar tu propio usuario' }, { status: 400 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al actualizar operador' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
