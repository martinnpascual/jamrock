import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  gerente: ['/dashboard', '/socios', '/dispensas', '/stock', '/ventas', '/pagos', '/cuentas-corrientes', '/proveedores', '/eventos', '/calendario', '/reportes', '/solicitudes', '/configuracion'],
  secretaria: ['/dashboard', '/socios', '/dispensas', '/stock', '/ventas', '/pagos', '/cuentas-corrientes', '/proveedores', '/eventos', '/calendario', '/solicitudes'],
  cultivador: ['/dashboard', '/socios', '/stock'],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Rutas públicas: no requieren auth
  const publicPaths = ['/login', '/inscripcion', '/api/enrollment']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    // Si ya está autenticado y va a /login, redirigir a /dashboard
    if (pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Sin usuario → redirigir a /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Leer el rol del app_metadata (está en el JWT — no requiere query a DB)
  const role = (user.app_metadata?.role ?? '') as keyof typeof ROLE_ROUTES

  // Usuario sin rol válido → logout
  if (!role || !ROLE_ROUTES[role]) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }
  const allowedRoutes = ROLE_ROUTES[role] || []

  // Las rutas /api/ tienen su propio control de acceso — no aplicar whitelist de roles
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Verificar que el rol tiene acceso a la ruta solicitada
  const hasAccess = allowedRoutes.some(route => pathname.startsWith(route))
  if (!hasAccess && pathname !== '/') {
    // Redirigir a dashboard si no tiene acceso
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Ruta raíz → redirigir a dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
