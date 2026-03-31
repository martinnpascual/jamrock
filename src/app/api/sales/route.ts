import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { saleSchema } from '@/lib/validations/sale'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para registrar ventas' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = saleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })

  const { product_id, member_id, quantity, unit_price, payment_method } = parsed.data
  const admin = createAdminClient()

  // Verificar stock disponible
  const { data: product } = await admin.from('commercial_products')
    .select('stock_quantity, name').eq('id', product_id).single()

  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  if (product.stock_quantity < quantity) {
    return NextResponse.json({
      error: `Stock insuficiente. Disponible: ${product.stock_quantity} unidades.`
    }, { status: 422 })
  }

  const total = quantity * unit_price

  const { data, error } = await admin.from('sales').insert({
    product_id,
    member_id: member_id ?? null,
    quantity,
    unit_price,
    total,
    payment_method,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 })
  return NextResponse.json({ sale: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') return NextResponse.json({ error: 'Solo gerente puede anular' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('sales').update({
    is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al anular venta' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
