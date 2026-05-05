import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CONFIG_KEY = 'product_categories'
const DEFAULT_CATEGORIES = ['Indumentaria', 'Accesorios', 'Alimentación', 'Papelería', 'Otro']

async function getCategories(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data } = await admin
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .single()
  if (!data) return DEFAULT_CATEGORIES
  return (data.value as string[]) ?? DEFAULT_CATEGORIES
}

// GET — lista de categorías
export async function GET() {
  const admin = createAdminClient()
  const categories = await getCategories(admin)
  return NextResponse.json({ categories })
}

// POST — agregar o reemplazar lista completa
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gerente') {
    return NextResponse.json({ error: 'Solo el gerente puede gestionar categorías' }, { status: 403 })
  }

  let body: { categories: string[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const categories: string[] = Array.from(new Set(
    (body.categories ?? [])
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0 && c.length <= 50)
  ))

  const admin = createAdminClient()
  const { error } = await admin.from('app_config').upsert({
    key: CONFIG_KEY,
    value: categories,
    description: 'Categorías de productos comerciales',
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: 'Error al guardar categorías' }, { status: 500 })
  return NextResponse.json({ categories })
}
