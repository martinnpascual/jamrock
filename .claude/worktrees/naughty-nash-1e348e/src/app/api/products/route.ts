import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { productSchema } from '@/lib/validations/sale'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede gestionar productos' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })

  const { name, description, category, price, stock_quantity, low_stock_threshold } = parsed.data
  const admin = createAdminClient()

  const { data, error } = await admin.from('commercial_products').insert({
    name, price, stock_quantity,
    description: description || null,
    category: category || null,
    low_stock_threshold: low_stock_threshold ?? 5,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  return NextResponse.json({ product: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  let body: { id: string } & Partial<ReturnType<typeof productSchema.parse>>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { id, ...rest } = body
  const admin = createAdminClient()
  const { data, error } = await admin.from('commercial_products')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()

  if (error) return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
  return NextResponse.json({ product: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('commercial_products').update({
    is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
