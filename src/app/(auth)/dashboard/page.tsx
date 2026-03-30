import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Syringe, Package, ClipboardList } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  // KPIs básicos
  const [membersRes, dispensasHoyRes, solicitudesRes] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('dispensations').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase.from('enrollment_requests').select('id', { count: 'exact', head: true }).eq('status', 'pendiente'),
  ])

  const totalSocios = membersRes.count ?? 0
  const dispensasHoy = dispensasHoyRes.count ?? 0
  const solicitudesPendientes = solicitudesRes.count ?? 0

  const kpis = [
    {
      title: 'Socios activos',
      value: totalSocios,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Dispensas hoy',
      value: dispensasHoy,
      icon: Syringe,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Solicitudes pendientes',
      value: solicitudesPendientes,
      icon: ClipboardList,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Stock medicinal',
      value: '—',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Resumen del día</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="shadow-sm border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.title}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{kpi.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/socios/nuevo"
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                <Users className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Nuevo socio</p>
                <p className="text-xs text-slate-400">Dar de alta</p>
              </div>
            </a>
            <a
              href="/dispensas/nueva"
              className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                <Syringe className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Nueva dispensa</p>
                <p className="text-xs text-slate-400">Registrar entrega</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sistema listo */}
      <Card className="shadow-sm border-green-200 bg-green-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm text-green-800 font-medium">Sistema operativo — Wave 1.1 completada</p>
          </div>
          <p className="text-xs text-green-700 mt-1 ml-5">
            Base de datos, autenticación y roles configurados. Continuando con Wave 1.2 (Gestión de socios).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
