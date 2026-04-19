import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const voidSchema = z.object({
  dispensation_id: z.string().uuid(),
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

export async function POST(request: NextRequest) {
  // Autenticación
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Solo gerente puede anular
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede anular dispensas' }, { status: 403 })
  }

  // Parsear body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = voidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { dispensation_id, reason } = parsed.data

  // Obtener dispensa original
  const { data: original, error: fetchError } = await supabase
    .from('dispensations')
    .select('id, dispensation_number, member_id, lot_id, type')
    .eq('id', dispensation_id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Dispensa no encontrada' }, { status: 404 })
  }

  if (original.type === 'anulacion') {
    return NextResponse.json({ error: 'No se puede anular una anulación' }, { status: 422 })
  }

  // Insertar registro de anulación
  const admin = createAdminClient()
  const { data: anulacion, error: insertError } = await admin
    .from('dispensations')
    .insert({
      member_id: original.member_id,
      quantity_grams: 0,
      genetics: 'ANULACIÓN',
      lot_id: original.lot_id ?? null,
      type: 'anulacion',
      nullifies_id: original.id,
      notes: `ANULACIÓN de #${original.dispensation_number}: ${reason}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error inserting void dispensation:', insertError.code)
    return NextResponse.json({ error: 'Error al registrar la anulación' }, { status: 500 })
  }

  return NextResponse.json({ anulacion }, { status: 201 })
}
