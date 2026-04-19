import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispensationSchema } from '@/lib/validations/dispensation'

export async function POST(request: NextRequest) {
  // Verificar autenticación
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar rol (solo gerente y secretaria)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['gerente', 'secretaria'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos para registrar dispensas' }, { status: 403 })
  }

  // Parsear y validar body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = dispensationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { member_id, quantity_grams, genetics, lot_id, notes } = parsed.data

  // Verificar que el socio puede dispensar usando la función SQL
  const { data: verifyResult, error: verifyError } = await supabase
    .rpc('can_member_dispense', { p_member_id: member_id })

  if (verifyError) {
    return NextResponse.json({ error: 'Error al verificar socio' }, { status: 500 })
  }

  const verification = verifyResult as { allowed: boolean; reason: string | null }
  if (!verification.allowed) {
    return NextResponse.json(
      { error: `Dispensa bloqueada: ${verification.reason}` },
      { status: 422 }
    )
  }

  // Si hay lot_id, verificar que tiene stock suficiente
  if (lot_id) {
    const { data: lot } = await supabase
      .from('medical_stock_lots')
      .select('current_grams, genetics')
      .eq('id', lot_id)
      .single()

    if (!lot) {
      return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
    }

    if (lot.current_grams < quantity_grams) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${lot.current_grams}g` },
        { status: 422 }
      )
    }
  }

  // Insertar con adminClient (bypasa RLS para garantizar el INSERT)
  const admin = createAdminClient()
  const { data: dispensation, error: insertError } = await admin
    .from('dispensations')
    .insert({
      member_id,
      quantity_grams,
      genetics,
      lot_id: lot_id ?? null,
      notes: notes ?? null,
      type: 'normal',
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error inserting dispensation:', insertError.code)
    return NextResponse.json({ error: 'Error al registrar dispensa' }, { status: 500 })
  }

  return NextResponse.json({ dispensation }, { status: 201 })
}

// Anulación de dispensa (crea nueva fila tipo 'anulacion')
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

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede anular dispensas' }, { status: 403 })
  }

  let body: { dispensation_id: string; reason: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.dispensation_id) {
    return NextResponse.json({ error: 'dispensation_id requerido' }, { status: 400 })
  }

  // Obtener la dispensa original
  const { data: original, error: fetchError } = await supabase
    .from('dispensations')
    .select('*')
    .eq('id', body.dispensation_id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Dispensa no encontrada' }, { status: 404 })
  }

  // Verificar que no sea ya una anulación
  if (original.type === 'anulacion') {
    return NextResponse.json({ error: 'No se puede anular una anulación' }, { status: 422 })
  }

  // Crear registro de anulación
  const admin = createAdminClient()
  const { data: anulacion, error: anulError } = await admin
    .from('dispensations')
    .insert({
      member_id: original.member_id,
      quantity_grams: original.quantity_grams,
      genetics: original.genetics,
      lot_id: original.lot_id,
      type: 'anulacion',
      nullifies_id: original.id,
      notes: body.reason || 'Anulación manual',
      created_by: user.id,
    })
    .select()
    .single()

  if (anulError) {
    return NextResponse.json({ error: 'Error al registrar anulación' }, { status: 500 })
  }

  return NextResponse.json({ anulacion }, { status: 201 })
}
