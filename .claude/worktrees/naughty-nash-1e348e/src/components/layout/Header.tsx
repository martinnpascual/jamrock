'use client'

import { usePathname } from 'next/navigation'
import { Menu, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

function WorkSessionBadge() {
  const [loginAt, setLoginAt] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('work_sessions')
        .select('login_at')
        .eq('user_id', user.id)
        .is('logout_at', null)
        .eq('is_deleted', false)
        .order('login_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data && !cancelled) setLoginAt(data.login_at)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!loginAt) return
    const calc = () => {
      const ms = Date.now() - new Date(loginAt).getTime()
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [loginAt])

  if (!loginAt) return null

  const timeStr = new Date(loginAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const dayStr = new Date(loginAt).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="ml-auto flex items-center gap-1.5 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 flex-shrink-0">
      <Clock className="w-3 h-3 text-[#2DC814]" />
      <span className="text-slate-500 hidden sm:inline capitalize">{dayStr} ·</span>
      <span className="text-slate-400">{timeStr}</span>
      <span className="text-slate-600 hidden sm:inline">·</span>
      <span className="text-[#2DC814] font-semibold tabular-nums hidden sm:inline">{elapsed}</span>
    </div>
  )
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 border-b border-white/5 bg-[#0c0c0c]/95 backdrop-blur-sm px-4 md:px-6 flex items-center gap-3 flex-shrink-0">
      {/* Hamburger — only visible on mobile */}
      <button
        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-white/5 transition-colors"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="font-heading text-base font-bold text-foreground tracking-tight">{title}</h1>
      <WorkSessionBadge />
    </header>
  )
}
