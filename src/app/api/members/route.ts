import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { memberSchema } from '@/lib/validations/member'

// POST — crear socio (solo gerente/secretaria)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para crear socios' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })
  }

  const admin = createAdminClient()
  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    birth_date: parsed.data.birth_date || null,
    address: parsed.data.address || null,
    reprocann_expiry: parsed.data.reprocann_expiry || null,
    reprocann_number: parsed.data.reprocann_number || null,
    notes: parsed.data.notes || null,
    created_by: user.id,
  }

  const { data, error } = await admin
    .from('members')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('member create error:', error.code)
    return NextResponse.json({ error: 'Error al crear socio' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE — soft delete socio (solo gerente)
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede eliminar socios' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('members')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', id)

  if (error) {
    console.error('member delete error:', error.code)
    return NextResponse.json({ error: 'Error al eliminar socio' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
