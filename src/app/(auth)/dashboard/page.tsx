export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Syringe, ClipboardList, AlertTriangle, ArrowRight, Clock, ArrowDownUp, ShoppingCart, Banknote } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ReprocannAlertBanner } from '@/components/shared/ReprocannAlertBanner'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user!.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const [
    sociosActivosRes,
    dispensasHoyRes,
    sociosVencidosRes,
    stockBajoRes,
    solicitudesRes,
    dispensasRecentesRes,
    cuentasEnDeudaRes,
    ventasHoyRes,
    fiadoHoyRes,
  ] = await Promise.all([
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('reprocann_status', 'vigente'),
    supabase
      .from('dispensations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .eq('type', 'normal'),
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('reprocann_status', 'en_tramite'),
    supabase
      .from('medical_stock_lots')
      .select('id, genetics, current_grams')
      .eq('is_deleted', false)
      .lt('current_grams', 50)
      .gt('current_grams', 0),
    supabase
      .from('enrollment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendiente'),
    supabase
      .from('dispensations')
      .select(`
        dispensation_number, quantity_grams, genetics, created_at,
        members!dispensations_member_id_fkey(first_name, last_name)
      `)
      .eq('type', 'normal')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('current_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .lt('balance', 0),
    supabase
      .from('checkout_transactions')
      .select('total_amount')
      .gte('created_at', `${today}T00:00:00`)
      .eq('payment_status', 'pagado'),
    supabase
      .from('checkout_transactions')
      .select('total_amount')
      .gte('created_at', `${today}T00:00:00`)
      .eq('payment_status', 'fiado'),
  ])

  const isGerente = profile?.role === 'gerente'
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  const ventasHoyTotal = (ventasHoyRes.data ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0)
  const fiadoHoyTotal  = (fiadoHoyRes.data  ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0)

  type Alert = { msg: string; href: string; color: string }
  const alerts: Alert[] = []
  if ((sociosVencidosRes.count ?? 0) > 0) {
    alerts.push({
      msg: `${sociosVencidosRes.count} socio(s) con REPROCANN en trámite`,
      href: '/socios?status=en_tramite',
      color: 'text-red-400 bg-red-950/40 border-red-900/50',
    })
  }
  if ((solicitudesRes.count ?? 0) > 0) {
    alerts.push({
      msg: `${solicitudesRes.count} solicitud(es) pendiente(s) de revisión`,
      href: '/solicitudes',
      color: 'text-amber-400 bg-amber-950/40 border-amber-900/50',
    })
  }
  if ((stockBajoRes.data?.length ?? 0) > 0) {
    alerts.push({
      msg: `${stockBajoRes.data?.length} lote(s) de stock medicinal bajo (< 50g)`,
      href: '/stock',
      color: 'text-orange-400 bg-orange-950/40 border-orange-900/50',
    })
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Buen día{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Socios activos"
          value={sociosActivosRes.count ?? 0}
          icon={Users}
          color="text-[#2DC814]"
          bg="bg-[#2DC814]/10"
          href="/socios"
        />
        <KPICard
          title="Dispensas hoy"
          value={dispensasHoyRes.count ?? 0}
          icon={Syringe}
          color="text-[#2DC814]"
          bg="bg-[#2DC814]/10"
          href="/dispensas"
        />
        <KPICard
          title="Solicitudes"
          value={solicitudesRes.count ?? 0}
          icon={ClipboardList}
          color={(solicitudesRes.count ?? 0) > 0 ? 'text-amber-400' : 'text-[#2DC814]'}
          bg={(solicitudesRes.count ?? 0) > 0 ? 'bg-amber-900/30' : 'bg-[#2DC814]/10'}
          href="/solicitudes"
          badge={(solicitudesRes.count ?? 0) > 0}
        />
        <KPICard
          title="REPROCANN en trámite"
          value={sociosVencidosRes.count ?? 0}
          icon={AlertTriangle}
          color={(sociosVencidosRes.count ?? 0) > 0 ? 'text-red-400' : 'text-[#2DC814]'}
          bg={(sociosVencidosRes.count ?? 0) > 0 ? 'bg-red-950/50' : 'bg-[#2DC814]/10'}
          href="/socios?status=en_tramite"
          badge={(sociosVencidosRes.count ?? 0) > 0}
        />
        {isGerente && (
          <KPICard
            title="Cuentas en deuda"
            value={cuentasEnDeudaRes.count ?? 0}
            icon={ArrowDownUp}
            color={(cuentasEnDeudaRes.count ?? 0) > 0 ? 'text-amber-400' : 'text-[#2DC814]'}
            bg={(cuentasEnDeudaRes.count ?? 0) > 0 ? 'bg-amber-900/30' : 'bg-[#2DC814]/10'}
            href="/cuentas-corrientes?balance_status=negative"
            badge={(cuentasEnDeudaRes.count ?? 0) > 0}
          />
        )}
        {isGerente && (
          <KPIAmountCard
            title="Ventas del día"
            amount={ventasHoyTotal}
            icon={ShoppingCart}
            color="text-[#2DC814]"
            bg="bg-[#2DC814]/10"
            href="/ventas"
          />
        )}
        {isGerente && fiadoHoyTotal > 0 && (
          <KPIAmountCard
            title="Fiado del día"
            amount={fiadoHoyTotal}
            icon={Banknote}
            color="text-amber-400"
            bg="bg-amber-900/30"
            href="/dispensas"
          />
        )}
      </div>

      {/* Banner REPROCANN — visible para gerente y secretaria */}
      {(profile?.role === 'gerente' || profile?.role === 'secretaria') && <ReprocannAlertBanner />}

      {/* Alertas — solo gerente */}
      {isGerente && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium hover:opacity-80 transition-opacity',
                a.color
              )}
            >
              <span>{a.msg}</span>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Acciones rápidas */}
        <Card className="shadow-sm border-white/[0.06] bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-300">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <QuickAction href="/socios/nuevo" label="Nuevo socio" sub="Dar de alta" colorClass="hover:border-[#2DC814]/30 hover:bg-[#2DC814]/5" emoji="👤" />
            <QuickAction href="/dispensas/nueva" label="Nueva dispensa" sub="Registrar entrega" colorClass="hover:border-sky-800/50 hover:bg-sky-900/20" emoji="💊" />
            <QuickAction href="/solicitudes" label="Solicitudes" sub={`${solicitudesRes.count ?? 0} pendientes`} colorClass="hover:border-amber-800/50 hover:bg-amber-900/20" emoji="📋" />
            <QuickAction href="/socios" label="Ver socios" sub="Lista completa" colorClass="hover:border-white/10 hover:bg-white/5" emoji="👥" />
          </CardContent>
        </Card>

        {/* Últimas dispensas */}
        <Card className="shadow-sm border-white/[0.06] bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-300">Últimas dispensas</CardTitle>
            <Link href="/dispensas" className="text-xs text-[#2DC814] hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {(dispensasRecentesRes.data ?? []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400">Sin dispensas registradas hoy</p>
                <Link href="/dispensas/nueva" className="text-xs text-green-600 hover:underline mt-1 inline-block">
                  Registrar primera dispensa
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(dispensasRecentesRes.data ?? []).map((d: any) => (
                  <div key={d.dispensation_number} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-200">
                        {d.members
                          ? Array.isArray(d.members)
                            ? `${d.members[0]?.first_name} ${d.members[0]?.last_name}`
                            : `${d.members.first_name} ${d.members.last_name}`
                          : '—'}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{d.genetics} · {d.dispensation_number}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-semibold text-slate-200">{d.quantity_grams}g</p>
                      <p className="text-xs text-slate-400 flex items-center justify-end gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(d.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  href,
  badge,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  href: string
  badge?: boolean
}) {
  return (
    <Link href={href}>
      <Card className="shadow-sm border-white/[0.06] bg-card hover:bg-[#1c1c1c] transition-colors cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{title}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            </div>
            <div className={cn('relative w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
              {badge && value > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#151515]" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function KPIAmountCard({
  title,
  amount,
  icon: Icon,
  color,
  bg,
  href,
}: {
  title: string
  amount: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  href: string
}) {
  const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  return (
    <Link href={href}>
      <Card className="shadow-sm border-white/[0.06] bg-card hover:bg-[#1c1c1c] transition-colors cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">{title}</p>
              <p className="text-xl font-bold text-foreground mt-1 leading-tight">{ARS(amount)}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickAction({
  href,
  label,
  sub,
  colorClass,
  emoji,
}: {
  href: string
  label: string
  sub: string
  colorClass: string
  emoji: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 p-3 border border-white/[0.06] rounded-lg transition-colors bg-white/[0.02]',
        colorClass
      )}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  )
}
