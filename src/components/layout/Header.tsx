'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/socios': 'Socios',
  '/dispensas': 'Dispensas',
  '/stock': 'Stock',
  '/ventas': 'Ventas y Caja',
  '/pagos': 'Pagos',
  '/proveedores': 'Proveedores',
  '/eventos': 'Eventos',
  '/calendario': 'Calendario',
  '/solicitudes': 'Solicitudes de inscripción',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
}

function getTitle(pathname: string): string {
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === route || pathname.startsWith(route + '/')) return title
  }
  return 'Jamrock Club'
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center gap-3 flex-shrink-0">
      {/* Hamburger — only visible on mobile */}
      <button
        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
    </header>
  )
}
