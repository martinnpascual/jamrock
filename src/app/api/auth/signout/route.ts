import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // Obtener usuario antes de cerrar sesión
  const { data: { user } } = await supabase.auth.getUser()

  // Cerrar sesión de trabajo activa
  if (user) {
    try {
      const admin = createAdminClient()
      await admin
        .from('work_sessions')
        .update({ logout_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('logout_at', null)
        .eq('is_deleted', false)
    } catch {
      // No bloquear el logout si falla el registro de sesión
    }
  }

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', new URL(request.url).origin))
}
