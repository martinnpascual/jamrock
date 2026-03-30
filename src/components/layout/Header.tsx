'use client'

import { usePathname } from 'next/navigation'

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

export function Header() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
    </header>
  )
}
