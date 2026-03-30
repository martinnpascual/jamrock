'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'
import {
  LayoutDashboard,
  Users,
  Syringe,
  Package,
  ShoppingCart,
  CreditCard,
  Truck,
  CalendarDays,
  BarChart3,
  ClipboardList,
  Settings,
  Leaf,
  LogOut,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Socios', href: '/socios', icon: Users, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Dispensas', href: '/dispensas', icon: Syringe, roles: ['gerente', 'secretaria'] },
  { label: 'Stock', href: '/stock', icon: Package, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Ventas / Caja', href: '/ventas', icon: ShoppingCart, roles: ['gerente', 'secretaria'] },
  { label: 'Pagos', href: '/pagos', icon: CreditCard, roles: ['gerente', 'secretaria'] },
  { label: 'Proveedores', href: '/proveedores', icon: Truck, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Eventos', href: '/eventos', icon: CalendarDays, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Solicitudes', href: '/solicitudes', icon: ClipboardList, roles: ['gerente', 'secretaria'] },
  { label: 'Reportes', href: '/reportes', icon: BarChart3, roles: ['gerente'] },
  { label: 'Configuración', href: '/configuracion', icon: Settings, roles: ['gerente'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role, profile, loading } = useRole()

  const visibleItems = NAV_ITEMS.filter(item =>
    role ? item.roles.includes(role) : false
  )

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-100 font-semibold text-sm leading-tight">Jamrock Club</p>
          <p className="text-slate-400 text-xs leading-tight">Gestión interna</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {loading ? (
          <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-green-400' : '')} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full" />
                )}
              </Link>
            )
          })
        )}
      </nav>

      {/* Footer: usuario + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{profile?.full_name || '...'}</p>
            <p className="text-slate-500 text-xs capitalize">{role || '...'}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title="Cerrar sesión"
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
