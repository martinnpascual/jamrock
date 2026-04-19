'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'
import {
  LayoutDashboard,
  Users,
  Syringe,
  ShoppingCart,
  Package,
  MoreHorizontal,
} from 'lucide-react'

interface BottomNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const ALL_ITEMS: BottomNavItem[] = [
  { label: 'Inicio',     href: '/dashboard', icon: LayoutDashboard, roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Socios',    href: '/socios',     icon: Users,           roles: ['gerente', 'secretaria', 'cultivador'] },
  { label: 'Dispensas', href: '/dispensas',  icon: Syringe,         roles: ['gerente', 'secretaria'] },
  { label: 'Ventas',    href: '/ventas',     icon: ShoppingCart,    roles: ['gerente', 'secretaria'] },
  { label: 'Stock',     href: '/stock',      icon: Package,         roles: ['cultivador'] },
]

interface MobileBottomNavProps {
  onMoreClick: () => void
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { role } = useRole()

  const visibleItems = ALL_ITEMS.filter(item =>
    role ? item.roles.includes(role) : false
  )

  // Show max 4 items + "Más" button
  const displayItems = visibleItems.slice(0, 4)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c] border-t border-white/[0.06] flex items-stretch h-16 safe-bottom">
      {displayItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative',
              isActive ? 'text-[#2DC814]' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#2DC814] rounded-b-full" />
            )}
            <Icon className="w-5 h-5" />
            <span className={cn('text-[10px] font-medium leading-tight', isActive ? 'text-[#2DC814]' : 'text-slate-500')}>
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* Más — opens sidebar */}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] font-medium leading-tight">Más</span>
      </button>
    </nav>
  )
}
