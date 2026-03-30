// ⚠️ SOLO importar en /app/api/ — NUNCA en componentes cliente o server components
import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
