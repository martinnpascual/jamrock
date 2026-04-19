'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'
import { useAlertCounts } from '@/hooks/useAlertCounts'
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
  X,
  ArrowDownUp,
  Activity,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Socios',       href: '/socios',       icon: Users,           roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Dispensas',    href: '/dispensas',    icon: Syringe,         roles: ['gerente', 'secretaria'] },
  { label: 'Stock',        href: '/stock',        icon: Package,         roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Ventas / Caja',href: '/ventas',       icon: ShoppingCart,    roles: ['gerente', 'secretaria'] },
  { label: 'Pagos',        href: '/pagos',        icon: CreditCard,      roles: ['gerente', 'secretaria'] },
  { label: 'Cuentas Ctes.',href: '/cuentas-corrientes', icon: ArrowDownUp, roles: ['gerente', 'secretaria'] },
  { label: 'Proveedores',  href: '/proveedores',  icon: Truck,           roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Eventos',      href: '/eventos',      icon: CalendarDays,    roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Solicitudes',  href: '/solicitudes',  icon: ClipboardList,   roles: ['gerente', 'secretaria'] },
  { label: 'Reportes',     href: '/reportes',     icon: BarChart3,       roles: ['gerente'] },
  { label: 'Actividad',   href: '/actividad',    icon: Activity,        roles: ['gerente'] },
  { label: 'Configuración',href: '/configuracion',icon: Settings,        roles: ['gerente'] },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { role, displayName, loading } = useRole()
  const { solicitudesPendientes, reprocannVencidos } = useAlertCounts()

  const visibleItems = NAV_ITEMS.filter(item =>
    role ? item.roles.includes(role) : false
  )

  return (
    <aside className="w-64 flex-shrink-0 bg-black flex flex-col h-screen border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-green-900/50">
          <Leaf className="w-5 h-5 text-white drop-shadow" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-heading font-bold text-sm leading-tight tracking-tight">Jamrock Club</p>
          <p className="text-slate-500 text-xs leading-tight">Gestión interna</p>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-200 p-1 transition-colors flex-shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#2DC814]/10 text-[#C8FF1C] shadow-sm ring-1 ring-[#2DC814]/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', isActive ? 'text-[#2DC814]' : 'text-slate-500')} />
                {item.label}
                {(() => {
                  const alertCount =
                    item.href === '/solicitudes' ? solicitudesPendientes
                    : item.href === '/socios' ? reprocannVencidos
                    : 0
                  if (alertCount > 0) {
                    return (
                      <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )
                  }
                  if (isActive) {
                    return <span className="ml-auto w-1.5 h-1.5 bg-[#C8FF1C] rounded-full shadow-sm shadow-[#C8FF1C]/50" />
                  }
                  return null
                })()}
              </Link>
            )
          })
        )}
      </nav>

      {/* Footer: usuario + logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">
              {displayName !== '...' ? displayName.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{displayName}</p>
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
