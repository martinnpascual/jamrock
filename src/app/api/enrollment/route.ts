import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enrollmentSchema } from '@/lib/validations/enrollment'

// POST — pública, sin autenticación requerida
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = enrollmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { first_name, last_name, dni, email, phone, birth_date, address, reprocann_status, reprocann_number, additional_info } = parsed.data

  // Usar adminClient para bypasear RLS (la política INSERT pública debería funcionar
  // con anonClient, pero adminClient garantiza el insert en todos los entornos)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('enrollment_requests')
    .insert({
      first_name,
      last_name,
      dni,
      email: email || null,
      phone: phone || null,
      birth_date: birth_date || null,
      address: address || null,
      reprocann_status: reprocann_status ?? null,
      reprocann_number: reprocann_number || null,
      additional_info: additional_info || null,
      status: 'pendiente',
    })
    .select('id')
    .single()

  if (error) {
    console.error('enrollment insert error:', error.code)
    return NextResponse.json({ error: 'Error al registrar solicitud' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

// PATCH — aprobar o rechazar (solo gerente/secretaria)
export async function PATCH(request: NextRequest) {
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
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: { id: string; action: 'aprobar' | 'rechazar'; rejection_reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'id y action requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Obtener la solicitud
  const { data: req, error: fetchError } = await admin
    .from('enrollment_requests')
    .select('*')
    .eq('id', body.id)
    .single()

  if (fetchError || !req) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (req.status !== 'pendiente') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 422 })
  }

  if (body.action === 'rechazar') {
    const { error: updateError } = await admin
      .from('enrollment_requests')
      .update({
        status: 'rechazada',
        rejection_reason: body.rejection_reason ?? 'Sin razón especificada',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', body.id)

    if (updateError) {
      return NextResponse.json({ error: 'Error al rechazar' }, { status: 500 })
    }

    return NextResponse.json({ status: 'rechazada' })
  }

  // Aprobar: actualizar solicitud + crear socio
  const [updateResult, memberResult] = await Promise.all([
    admin
      .from('enrollment_requests')
      .update({
        status: 'aprobada',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', body.id),
    admin
      .from('members')
      .insert({
        first_name: req.first_name,
        last_name: req.last_name,
        dni: req.dni,
        email: req.email ?? null,
        phone: req.phone ?? null,
        birth_date: req.birth_date ?? null,
        address: req.address ?? null,
        reprocann_status: req.reprocann_status ?? 'en_tramite',
        reprocann_number: req.reprocann_number ?? null,
        member_type: 'standard',
        notes: req.additional_info ?? null,
        created_by: user.id,
      })
      .select('id, member_number')
      .single(),
  ])

  if (updateResult.error || memberResult.error) {
    console.error('approve error:', updateResult.error?.code, memberResult.error?.code)
    return NextResponse.json({ error: 'Error al aprobar solicitud' }, { status: 500 })
  }

  return NextResponse.json({
    status: 'aprobada',
    member: memberResult.data,
  })
}
