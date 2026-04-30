'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Download, Users, Syringe, DollarSign, Package, FileText, Calendar, Lock, TrendingUp, Clock } from 'lucide-react'
import { useRole } from '@/hooks/useRole'
import { cn } from '@/lib/utils'

type ReportType = 'dispensas' | 'socios' | 'financiero' | 'stock' | 'caja' | 'rentabilidad' | 'horas'
const ARS = (n: number | string | null | undefined): string => {
  const val = parseFloat(String(n ?? 0))
  if (isNaN(val)) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60
  if (h === 0) return `${m}m`; if (m === 0) return `${h}h`; return `${h}h ${m}m`
}

function useDateRange(from: string, to: string) {
  return {
    from: from + 'T00:00:00',
    to: to + 'T23:59:59',
  }
}

function useReportData(type: ReportType, from: string, to: string, shiftFilter: string, onlyDiff: boolean) {
  const range = useDateRange(from, to)
  return useQuery({
    queryKey: ['report', type, from, to, shiftFilter, onlyDiff],
    queryFn: async () => {
      const supabase = createClient()
      if (type === 'dispensas') {
        const { data } = await supabase
          .from('dispensations')
          .select('dispensation_number, quantity_grams, genetics, type, created_at, members!dispensations_member_id_fkey(first_name, last_name, member_number)')
          .gte('created_at', range.from).lte('created_at', range.to)
          .order('created_at', { ascending: false })
          .limit(500)
        return data ?? []
      }
      if (type === 'socios') {
        const { data } = await supabase
          .from('members')
          .select('member_number, first_name, last_name, reprocann_status, member_type, created_at')
          .eq('is_deleted', false)
          .order('member_number')
          .limit(500)
        return data ?? []
      }
      if (type === 'financiero') {
        const [sales, payments] = await Promise.all([
          supabase.from('sales')
            .select('total, payment_method, created_at, commercial_products!sales_product_id_fkey(name)')
            .eq('is_deleted', false).gte('created_at', range.from).lte('created_at', range.to)
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('payments')
            .select('amount, concept, payment_method, created_at, members!payments_member_id_fkey(first_name, last_name)')
            .eq('is_deleted', false).gte('created_at', range.from).lte('created_at', range.to)
            .order('created_at', { ascending: false })
            .limit(500),
        ])
        return { sales: sales.data ?? [], payments: payments.data ?? [] }
      }
      if (type === 'stock') {
        const { data } = await supabase
          .from('medical_stock_lots')
          .select('genetics, initial_grams, current_grams, lot_date, cost_per_gram')
          .eq('is_deleted', false)
          .order('lot_date', { ascending: false })
          .limit(200)
        return data ?? []
      }
      if (type === 'rentabilidad') {
        const { data } = await supabase
          .from('medical_stock_lots')
          .select('genetics, initial_grams, current_grams, lot_date, cost_per_gram, cost_total, sale_price_total, outsourced_provider_name, is_outsourced')
          .eq('is_deleted', false)
          .eq('is_outsourced', true)
          .order('lot_date', { ascending: false })
          .limit(200)
        return data ?? []
      }
      if (type === 'horas') {
        const month = from.slice(0, 7)
        const res = await fetch(`/api/work-sessions?month=${month}`)
        if (!res.ok) throw new Error('Error al cargar sesiones')
        return res.json()
      }
      if (type === 'caja') {
        let query = supabase
          .from('cash_registers')
          .select('id, register_date, shift, expected_total, actual_total, difference, status, closed_by, closed_at, notes, profiles!cash_registers_closed_by_fkey(full_name)')
          .eq('status', 'cerrada')
          .gte('register_date', from)
          .lte('register_date', to)
          .order('register_date', { ascending: false })

        if (shiftFilter !== 'todos') {
          query = query.eq('shift', shiftFilter)
        }

        const { data } = await query.limit(500)
        let rows = data ?? []

        // Filter only with difference client-side (simpler than DB filter for non-zero)
        if (onlyDiff) {
          rows = rows.filter(r => r.difference !== null && r.difference !== 0)
        }

        return rows
      }
      return []
    },
  })
}

function toCSV(rows: string[][], headers: string[]): string {
  const escape = (v: string) => `"${(v ?? '').toString().replace(/"/g, '""')}"`
  return [headers.map(escape), ...rows.map(r => r.map(escape))].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const { role } = useRole()
  const isGerente = role === 'gerente'
  const [type, setType] = useState<ReportType>('dispensas')
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  // Caja filters
  const [shiftFilter, setShiftFilter] = useState<string>('todos')
  const [onlyDiff, setOnlyDiff] = useState(false)

  const { data, isLoading } = useReportData(type, from, to, shiftFilter, onlyDiff)

  const REPORTS = ([
    { id: 'dispensas', label: 'Dispensas', Icon: Syringe, desc: 'Historial completo de entregas' },
    { id: 'socios', label: 'Socios', Icon: Users, desc: 'Padrón general de miembros' },
    { id: 'financiero', label: 'Financiero', Icon: DollarSign, desc: 'Ventas y pagos del período' },
    { id: 'stock', label: 'Stock medicinal', Icon: Package, desc: 'Estado actual de lotes' },
    { id: 'caja', label: 'Cierre de caja', Icon: Lock, desc: 'Cierres por turno y fecha' },
    { id: 'rentabilidad', label: 'Rentabilidad', Icon: TrendingUp, desc: 'Genéticas tercerizadas', gerenteOnly: true },
    { id: 'horas', label: 'Horas', Icon: Clock, desc: 'Turnos por operador', gerenteOnly: true },
  ] as { id: ReportType; label: string; Icon: React.ComponentType<{ className?: string }>; desc: string; gerenteOnly?: boolean }[]
  ).filter((r) => !r.gerenteOnly || isGerente)

  function handleExport() {
    if (!data) return
    const stamp = `${from}_${to}`

    if (type === 'dispensas') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csv = toCSV((data as any[]).map((d: any) => {
        const m = Array.isArray(d.members) ? d.members[0] : d.members
        return [d.dispensation_number, m ? `${m.first_name} ${m.last_name}` : '', m?.member_number ?? '', d.quantity_grams, d.genetics, d.type, new Date(d.created_at).toLocaleDateString('es-AR')]
      }), ['N° Dispensa', 'Socio', 'N° Socio', 'Gramos', 'Genética', 'Tipo', 'Fecha'])
      downloadCSV(csv, `dispensas_${stamp}.csv`)
    }

    if (type === 'socios') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csv = toCSV((data as any[]).map((d: any) => [d.member_number, d.first_name, d.last_name, d.reprocann_status, d.member_type, new Date(d.created_at).toLocaleDateString('es-AR')]),
        ['N° Socio', 'Nombre', 'Apellido', 'REPROCANN', 'Tipo', 'Alta'])
      downloadCSV(csv, `socios_${stamp}.csv`)
    }

    if (type === 'financiero') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fd = data as { sales: any[]; payments: any[] }
      const salesCSV = toCSV(fd.sales.map(s => {
        const p = Array.isArray(s.commercial_products) ? s.commercial_products[0] : s.commercial_products
        return [p?.name ?? '', s.total, s.payment_method, new Date(s.created_at).toLocaleDateString('es-AR')]
      }), ['Producto', 'Total', 'Método', 'Fecha'])
      downloadCSV(salesCSV, `ventas_${stamp}.csv`)
      const paymentsCSV = toCSV(fd.payments.map(p => {
        const m = Array.isArray(p.members) ? p.members[0] : p.members
        const conceptLabel = p.concept === 'checkout' ? 'Dispensa' : p.concept === 'cuota' ? 'Cuota' : p.concept
        return [m ? `${m.first_name} ${m.last_name}` : '', p.amount, conceptLabel, p.payment_method, new Date(p.created_at).toLocaleDateString('es-AR')]
      }), ['Socio', 'Monto', 'Concepto', 'Método', 'Fecha'])
      downloadCSV(paymentsCSV, `pagos_${stamp}.csv`)
    }

    if (type === 'stock') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csv = toCSV((data as any[]).map(d => [d.genetics, d.initial_grams, d.current_grams, d.initial_grams - d.current_grams, d.cost_per_gram ?? '', new Date(d.lot_date).toLocaleDateString('es-AR')]),
        ['Genética', 'Gramos iniciales', 'Gramos actuales', 'Gramos dispensados', 'Costo/g', 'Fecha lote'])
      downloadCSV(csv, `stock_${stamp}.csv`)
    }

    if (type === 'horas') {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const horasData = data as any
      const profileMap = new Map((horasData.profiles ?? []).map((p: any) => [p.id, p]))
      const rows = [...(horasData.sessions ?? [])]
        .sort((a: any, b: any) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime())
        .map((s: any) => {
          const profile: any = profileMap.get(s.user_id)
          const loginDate = new Date(s.login_at)
          const logoutDate = s.logout_at ? new Date(s.logout_at) : null
          return [
            profile?.full_name ?? '—',
            profile?.role ?? '—',
            loginDate.toLocaleDateString('es-AR'),
            loginDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            logoutDate ? logoutDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'En curso',
            s.duration_minutes != null ? formatMinutes(s.duration_minutes) : '—',
            s.logout_at ? 'Cerrado' : 'Activo',
          ]
        })
      const csv = toCSV(rows, ['Operador', 'Rol', 'Fecha', 'Inicio turno', 'Fin turno', 'Duración', 'Estado'])
      downloadCSV(csv, `horas_${from.slice(0, 7)}.csv`)
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    if (type === 'rentabilidad') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csv = toCSV((data as any[]).map((d: any) => {
        const netProfit = (d.sale_price_total ?? 0) - (d.cost_total ?? 0)
        const margin = d.cost_total > 0 ? ((netProfit / d.cost_total) * 100).toFixed(1) + '%' : '—'
        return [
          d.genetics,
          d.outsourced_provider_name ?? '—',
          d.initial_grams,
          String(d.cost_total ?? '—'),
          String(d.sale_price_total ?? '—'),
          String(netProfit),
          margin,
          new Date(d.lot_date).toLocaleDateString('es-AR'),
        ]
      }), ['Genética', 'Proveedor', 'Gramos', 'Costo total', 'Venta total', 'Ganancia neta', '% margen', 'Fecha lote'])
      downloadCSV(csv, `rentabilidad_${stamp}.csv`)
    }

    if (type === 'caja') {
      const rows = data as unknown as CajaRow[]
      const csvRows = rows.map(d => {
        const p = Array.isArray(d.profiles) ? (d.profiles as unknown[])[0] as { full_name: string } | null : d.profiles as { full_name: string } | null
        return [
          new Date(d.register_date + 'T12:00:00').toLocaleDateString('es-AR'),
          d.shift === 'mañana' ? 'Mañana' : 'Tarde',
          String(d.expected_total ?? 0),
          String(d.actual_total ?? 0),
          String(d.difference ?? 0),
          p?.full_name ?? '—',
          d.closed_at ? new Date(d.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—',
          d.notes ?? '',
        ]
      })
      // Add totals row
      const totExpected = rows.reduce((s, r) => s + Number(r.expected_total ?? 0), 0)
      const totActual = rows.reduce((s, r) => s + Number(r.actual_total ?? 0), 0)
      const totDiff = rows.reduce((s, r) => s + Number(r.difference ?? 0), 0)
      csvRows.push(['TOTALES', '', String(totExpected), String(totActual), String(totDiff), '', '', ''])

      const csv = toCSV(csvRows, ['Fecha', 'Turno', 'Esperado ($)', 'Contado ($)', 'Diferencia ($)', 'Cerrado por', 'Hora cierre', 'Notas'])
      downloadCSV(csv, `cierre_caja_${stamp}.csv`)
    }
  }

  const showDateRange = ['dispensas', 'financiero', 'caja', 'horas'].includes(type)

  function getRecordCount(): string {
    if (!data) return '0 registros'
    if (type === 'financiero') {
      const fd = data as { sales: unknown[]; payments: unknown[] }
      return `${fd.sales.length + fd.payments.length} registros`
    }
    if (type === 'horas') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = data as any
      return `${(h.sessions ?? []).length} sesiones`
    }
    return `${(data as unknown[]).length} registros`
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reportes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Exportá datos en CSV para análisis externos</p>
        </div>
        <Button onClick={handleExport} disabled={isLoading || !data} variant="outline" className="gap-2 h-10 border-[#2DC814]/30 text-[#2DC814] hover:bg-[#2DC814]/10">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Selector de reporte */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, Icon, desc }) => (
          <button
            key={id}
            onClick={() => setType(id)}
            className={cn(
              'text-left p-4 rounded-xl border-2 transition-all group',
              type === id
                ? 'border-[#2DC814]/50 bg-[#2DC814]/5 shadow-sm shadow-[#2DC814]/10'
                : 'border-white/[0.06] bg-[#111111] hover:border-white/[0.15] hover:bg-white/[0.03]'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-all',
              type === id ? 'bg-[#2DC814]/20' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
            )}>
              <Icon className={cn('w-4 h-4', type === id ? 'text-[#2DC814]' : 'text-slate-400')} />
            </div>
            <p className={cn('text-sm font-semibold leading-tight', type === id ? 'text-[#2DC814]' : 'text-slate-200')}>{label}</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{desc}</p>
          </button>
        ))}
      </div>

      {/* Rango de fechas */}
      {showDateRange && (
        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/[0.06]">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            {type === 'horas' ? (
              <>
                <span className="text-xs text-slate-500">Mes:</span>
                <input type="month" value={from.slice(0, 7)} onChange={e => { setFrom(e.target.value + '-01'); setTo(e.target.value + '-31') }}
                  className="text-sm border border-white/[0.1] bg-[#111111] text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50" />
                <span className="text-xs text-slate-500">— muestra todas las sesiones del mes</span>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500">Período:</span>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="text-sm border border-white/[0.1] bg-[#111111] text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50" />
                <span className="text-xs text-slate-500">hasta</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="text-sm border border-white/[0.1] bg-[#111111] text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Filtros de caja */}
      {type === 'caja' && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Turno:</span>
            {['todos', 'mañana', 'tarde'].map(s => (
              <button
                key={s}
                onClick={() => setShiftFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  shiftFilter === s
                    ? 'bg-[#2DC814]/10 border-[#2DC814]/30 text-[#2DC814]'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                )}
              >
                {s === 'todos' ? 'Todos' : s === 'mañana' ? 'Mañana' : 'Tarde'}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyDiff}
              onChange={e => setOnlyDiff(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-[#2DC814] focus:ring-[#2DC814]/50"
            />
            <span className="text-xs text-slate-400">Solo con diferencia</span>
          </label>
        </div>
      )}

      {/* Tabla de resultados */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">
              {REPORTS.find(r => r.id === type)?.label}
            </span>
          </div>
          {!isLoading && data && (
            <Badge variant="outline" className="text-xs text-slate-500">
              {getRecordCount()}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            {type === 'dispensas' && <DispensasTable data={data as unknown as DispensaRow[]} />}
            {type === 'socios' && <SociosTable data={data as unknown as SocioRow[]} />}
            {type === 'financiero' && <FinancieroTable data={data as unknown as FinancieroData} />}
            {type === 'stock' && <StockTable data={data as unknown as StockRow[]} />}
            {type === 'caja' && <CajaTable data={data as unknown as CajaRow[]} />}
            {type === 'rentabilidad' && <RentabilidadTable data={data as unknown as RentabilidadRow[]} />}
            {type === 'horas' && <HorasTable data={data as unknown as HorasReportData} />}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tipos para tablas ── */
type DispensaRow = { dispensation_number: string; quantity_grams: number; genetics: string; type: string; created_at: string; members: { first_name: string; last_name: string; member_number: string } | null }
type SocioRow = { member_number: string; first_name: string; last_name: string; reprocann_status: string; member_type: string; created_at: string }
type FinancieroData = { sales: { total: number; payment_method: string | null; created_at: string; commercial_products: { name: string } | null }[]; payments: { amount: number; concept: string; payment_method: string | null; created_at: string; members: { first_name: string; last_name: string } | null }[] }
type StockRow = { genetics: string; initial_grams: number; current_grams: number; cost_per_gram: number | null; lot_date: string }
type CajaRow = { id: string; register_date: string; shift: string; expected_total: number; actual_total: number | null; difference: number | null; status: string; closed_by: string | null; closed_at: string | null; notes: string | null; profiles: { full_name: string } | null }
type RentabilidadRow = { genetics: string; outsourced_provider_name: string | null; initial_grams: number; current_grams: number; cost_total: number | null; sale_price_total: number | null; lot_date: string }

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn('px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-white/[0.02]', className)}>{children}</th>
)
const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn('px-4 py-3 text-sm text-slate-300 border-b border-white/[0.04]', className)}>{children}</td>
)

function DispensasTable({ data }: { data: DispensaRow[] }) {
  if (!data.length) return <EmptyReport />
  const total = data.filter(d => d.type === 'normal').reduce((s, d) => s + d.quantity_grams, 0)
  return (
    <>
      <div className="px-5 py-3 bg-[#2DC814]/5 border-b border-[#2DC814]/10 text-sm text-[#2DC814]">
        Total dispensado: <strong>{total.toFixed(1)}g</strong> en {data.filter(d => d.type === 'normal').length} dispensas
      </div>
      <table className="w-full">
        <thead><tr><TH>N°</TH><TH>Socio</TH><TH>Gramos</TH><TH>Genética</TH><TH>Tipo</TH><TH>Fecha</TH></tr></thead>
        <tbody>
          {data.map(d => {
            const m = Array.isArray(d.members) ? (d.members as unknown[])[0] as typeof d.members : d.members
            return (
              <tr key={d.dispensation_number} className={cn('hover:bg-white/[0.02]', d.type === 'anulacion' && 'opacity-50')}>
                <TD><span className="font-mono text-xs">{d.dispensation_number}</span></TD>
                <TD>{m ? `${m.first_name} ${m.last_name}` : '—'}</TD>
                <TD><span className="font-semibold">{d.quantity_grams}g</span></TD>
                <TD>{d.genetics}</TD>
                <TD>{d.type === 'anulacion' ? <Badge variant="outline" className="text-xs text-red-400 border-red-500/20">Anulada</Badge> : <Badge variant="outline" className="text-xs text-[#2DC814] border-[#2DC814]/20">Normal</Badge>}</TD>
                <TD className="text-slate-400">{new Date(d.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

const REPROCANN_COLORS: Record<string, string> = {
  activo: 'text-[#2DC814] border-[#2DC814]/20 bg-[#2DC814]/10',
  en_tramite: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
  vencido: 'text-red-400 border-red-500/20 bg-red-500/10',
  cancelado: 'text-slate-500 border-white/10',
}

function SociosTable({ data }: { data: SocioRow[] }) {
  if (!data.length) return <EmptyReport />
  const activos = data.filter(d => d.reprocann_status === 'vigente').length
  return (
    <>
      <div className="px-5 py-3 bg-sky-500/5 border-b border-sky-500/10 text-sm text-sky-400">
        {data.length} socios · <strong>{activos} con REPROCANN vigente</strong>
      </div>
      <table className="w-full">
        <thead><tr><TH>N° Socio</TH><TH>Nombre</TH><TH>REPROCANN</TH><TH>Tipo</TH><TH>Alta</TH></tr></thead>
        <tbody>
          {data.map(d => (
            <tr key={d.member_number} className="hover:bg-white/[0.02]">
              <TD><span className="font-mono text-xs font-semibold">{d.member_number}</span></TD>
              <TD>{d.first_name} {d.last_name}</TD>
              <TD><Badge variant="outline" className={cn('text-xs border capitalize', REPROCANN_COLORS[d.reprocann_status] ?? '')}>{d.reprocann_status.replace('_', ' ')}</Badge></TD>
              <TD className="capitalize">{d.member_type}</TD>
              <TD className="text-slate-400">{new Date(d.created_at).toLocaleDateString('es-AR')}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function FinancieroTable({ data }: { data: FinancieroData }) {
  const totalSales = data.sales.reduce((s, x) => s + x.total, 0)
  const totalPayments = data.payments.reduce((s, x) => s + x.amount, 0)
  return (
    <>
      <div className="px-5 py-3 bg-[#2DC814]/5 border-b border-[#2DC814]/10 text-sm text-[#2DC814] flex gap-6">
        <span>Ventas: <strong>{ARS(totalSales)}</strong> ({data.sales.length})</span>
        <span>Pagos: <strong>{ARS(totalPayments)}</strong> ({data.payments.length})</span>
        <span className="font-bold">Total: {ARS(totalSales + totalPayments)}</span>
      </div>
      {data.sales.length > 0 && (
        <>
          <div className="px-4 py-2 bg-white/[0.03] text-xs font-semibold text-slate-500 uppercase">Ventas</div>
          <table className="w-full">
            <thead><tr><TH>Producto</TH><TH>Total</TH><TH>Método</TH><TH>Fecha</TH></tr></thead>
            <tbody>
              {data.sales.map((s, i) => {
                const p = Array.isArray(s.commercial_products) ? (s.commercial_products as unknown[])[0] as typeof s.commercial_products : s.commercial_products
                return (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <TD>{p?.name ?? '—'}</TD>
                    <TD><span className="font-semibold text-[#2DC814]">{ARS(s.total)}</span></TD>
                    <TD className="capitalize">{s.payment_method ?? '—'}</TD>
                    <TD className="text-slate-400">{new Date(s.created_at).toLocaleDateString('es-AR')}</TD>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      {data.payments.length > 0 && (
        <>
          <div className="px-4 py-2 bg-white/[0.03] text-xs font-semibold text-slate-500 uppercase">Pagos de socios</div>
          <table className="w-full">
            <thead><tr><TH>Socio</TH><TH>Monto</TH><TH>Concepto</TH><TH>Método</TH><TH>Fecha</TH></tr></thead>
            <tbody>
              {data.payments.map((p, i) => {
                const m = Array.isArray(p.members) ? (p.members as unknown[])[0] as typeof p.members : p.members
                return (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <TD>{m ? `${m.first_name} ${m.last_name}` : '—'}</TD>
                    <TD><span className="font-semibold text-[#2DC814]">{ARS(p.amount)}</span></TD>
                    <TD className="capitalize">{p.concept === 'checkout' ? 'Dispensa' : p.concept === 'cuota' ? 'Cuota' : p.concept.replace('_', ' ')}</TD>
                    <TD className="capitalize">{p.payment_method ?? '—'}</TD>
                    <TD className="text-slate-400">{new Date(p.created_at).toLocaleDateString('es-AR')}</TD>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      {!data.sales.length && !data.payments.length && <EmptyReport />}
    </>
  )
}

function StockTable({ data }: { data: StockRow[] }) {
  if (!data.length) return <EmptyReport />
  const totalActual = data.reduce((s, d) => s + d.current_grams, 0)
  const totalInicial = data.reduce((s, d) => s + d.initial_grams, 0)
  return (
    <>
      <div className="px-5 py-3 bg-[#2DC814]/5 border-b border-[#2DC814]/10 text-sm text-[#2DC814]">
        Stock total: <strong>{totalActual.toFixed(1)}g disponibles</strong> de {totalInicial.toFixed(0)}g originales
      </div>
      <table className="w-full">
        <thead><tr><TH>Genética</TH><TH>Inicial</TH><TH>Actual</TH><TH>Dispensado</TH><TH>%</TH><TH>Costo/g</TH><TH>Fecha lote</TH></tr></thead>
        <tbody>
          {data.map((d, i) => {
            const pct = d.initial_grams > 0 ? (d.current_grams / d.initial_grams) * 100 : 0
            return (
              <tr key={i} className="hover:bg-white/[0.02]">
                <TD><span className="font-medium">{d.genetics}</span></TD>
                <TD>{d.initial_grams.toFixed(0)}g</TD>
                <TD><span className={cn('font-semibold', d.current_grams <= 0 ? 'text-red-400' : d.current_grams < 50 ? 'text-yellow-400' : 'text-[#2DC814]')}>{d.current_grams.toFixed(1)}g</span></TD>
                <TD className="text-slate-500">{(d.initial_grams - d.current_grams).toFixed(1)}g</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', pct < 20 ? 'bg-red-400' : pct < 50 ? 'bg-yellow-400' : 'bg-green-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                  </div>
                </TD>
                <TD>{d.cost_per_gram ? `$${d.cost_per_gram}` : '—'}</TD>
                <TD className="text-slate-400">{new Date(d.lot_date).toLocaleDateString('es-AR')}</TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

function CajaTable({ data }: { data: CajaRow[] }) {
  if (!data.length) return <EmptyReport />

  const totExpected = data.reduce((s, r) => s + Number(r.expected_total ?? 0), 0)
  const totActual = data.reduce((s, r) => s + Number(r.actual_total ?? 0), 0)
  const totDiff = data.reduce((s, r) => s + Number(r.difference ?? 0), 0)

  return (
    <>
      <div className="px-5 py-3 bg-[#2DC814]/5 border-b border-[#2DC814]/10 text-sm text-[#2DC814] flex gap-6 flex-wrap">
        <span>Cierres: <strong>{data.length}</strong></span>
        <span>Total esperado: <strong>{ARS(totExpected)}</strong></span>
        <span>Total contado: <strong>{ARS(totActual)}</strong></span>
        <span className={cn('font-bold', totDiff === 0 ? '' : totDiff > 0 ? 'text-sky-400' : 'text-red-400')}>
          Diferencia: {totDiff >= 0 ? '+' : ''}{ARS(totDiff)}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <TH>Fecha</TH>
            <TH>Turno</TH>
            <TH>Esperado</TH>
            <TH>Contado</TH>
            <TH>Diferencia</TH>
            <TH>Cerrado por</TH>
            <TH>Hora cierre</TH>
            <TH>Notas</TH>
          </tr>
        </thead>
        <tbody>
          {data.map(d => {
            const prof = Array.isArray(d.profiles) ? (d.profiles as unknown[])[0] as typeof d.profiles : d.profiles
            const diff = d.difference ?? 0
            return (
              <tr key={d.id} className="hover:bg-white/[0.02]">
                <TD>{new Date(d.register_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TD>
                <TD>
                  <Badge variant="outline" className={cn('text-xs capitalize',
                    d.shift === 'mañana' ? 'text-amber-400 border-amber-500/20' : 'text-blue-400 border-blue-500/20'
                  )}>
                    {d.shift === 'mañana' ? 'Mañana' : 'Tarde'}
                  </Badge>
                </TD>
                <TD className="font-medium">{ARS(Number(d.expected_total ?? 0))}</TD>
                <TD className="font-medium">{ARS(Number(d.actual_total ?? 0))}</TD>
                <TD>
                  <span className={cn('font-semibold',
                    diff === 0 ? 'text-[#2DC814]' : diff > 0 ? 'text-sky-400' : 'text-red-400'
                  )}>
                    {diff >= 0 ? '+' : ''}{ARS(diff)}
                  </span>
                </TD>
                <TD className="text-slate-400">{prof?.full_name ?? '—'}</TD>
                <TD className="text-slate-400">
                  {d.closed_at ? new Date(d.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </TD>
                <TD className="text-slate-400 max-w-[150px] truncate">{d.notes ?? '—'}</TD>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-white/[0.03]">
            <TD className="font-bold text-slate-200">TOTALES</TD>
            <TD>{' '}</TD>
            <TD className="font-bold text-slate-200">{ARS(totExpected)}</TD>
            <TD className="font-bold text-slate-200">{ARS(totActual)}</TD>
            <TD>
              <span className={cn('font-bold', totDiff === 0 ? 'text-[#2DC814]' : totDiff > 0 ? 'text-sky-400' : 'text-red-400')}>
                {totDiff >= 0 ? '+' : ''}{ARS(totDiff)}
              </span>
            </TD>
            <TD>{' '}</TD>
            <TD>{' '}</TD>
            <TD>{' '}</TD>
          </tr>
        </tfoot>
      </table>
    </>
  )
}

function RentabilidadTable({ data }: { data: RentabilidadRow[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <FileText className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Sin lotes tercerizados registrados</p>
        <p className="text-xs text-slate-600 mt-1">Creá un lote con la opción &quot;¿Lote tercerizado?&quot; activada en Stock</p>
      </div>
    )
  }

  const totalCost = data.reduce((s, d) => s + (d.cost_total ?? 0), 0)
  const totalSale = data.reduce((s, d) => s + (d.sale_price_total ?? 0), 0)
  const totalProfit = totalSale - totalCost
  const avgMargin = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : null

  return (
    <>
      <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/10 text-sm text-amber-400 flex gap-6 flex-wrap">
        <span>{data.length} lotes tercerizados</span>
        <span>Costo total: <strong>{ARS(totalCost)}</strong></span>
        <span>Venta total: <strong>{ARS(totalSale)}</strong></span>
        <span className={cn('font-bold', totalProfit >= 0 ? 'text-[#2DC814]' : 'text-red-400')}>
          Ganancia: {ARS(totalProfit)}
          {avgMargin && <span className="text-xs ml-1 opacity-70">({avgMargin}%)</span>}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <TH>Genética</TH>
            <TH>Proveedor</TH>
            <TH>Gramos</TH>
            <TH>Costo total</TH>
            <TH>Venta total</TH>
            <TH>Ganancia neta</TH>
            <TH>% Margen</TH>
            <TH>Fecha lote</TH>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const netProfit = (d.sale_price_total ?? 0) - (d.cost_total ?? 0)
            const margin = d.cost_total && d.cost_total > 0
              ? ((netProfit / d.cost_total) * 100).toFixed(1)
              : null
            return (
              <tr key={i} className="hover:bg-white/[0.02]">
                <TD><span className="font-medium">{d.genetics}</span></TD>
                <TD className="text-slate-400">{d.outsourced_provider_name ?? '—'}</TD>
                <TD>{d.initial_grams.toFixed(0)}g</TD>
                <TD>
                  {d.cost_total != null
                    ? <span className="text-red-400">{ARS(d.cost_total)}</span>
                    : <span className="text-slate-500">—</span>}
                </TD>
                <TD>
                  {d.sale_price_total != null
                    ? <span className="text-[#2DC814]">{ARS(d.sale_price_total)}</span>
                    : <span className="text-slate-500">—</span>}
                </TD>
                <TD>
                  {d.cost_total != null && d.sale_price_total != null ? (
                    <span className={cn('font-semibold', netProfit >= 0 ? 'text-[#2DC814]' : 'text-red-400')}>
                      {ARS(netProfit)}
                    </span>
                  ) : <span className="text-slate-500">—</span>}
                </TD>
                <TD>
                  {margin != null ? (
                    <span className={cn('text-xs font-semibold', parseFloat(margin) >= 0 ? 'text-[#2DC814]' : 'text-red-400')}>
                      {margin}%
                    </span>
                  ) : '—'}
                </TD>
                <TD className="text-slate-400">{new Date(d.lot_date).toLocaleDateString('es-AR')}</TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

type HorasReportData = {
  sessions: { id: string; user_id: string; login_at: string; logout_at: string | null; duration_minutes: number | null }[]
  profiles: { id: string; full_name: string; role: string }[]
}

function HorasTable({ data }: { data: HorasReportData }) {
  if (!data?.sessions?.length) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Clock className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Sin sesiones registradas para este mes</p>
      </div>
    )
  }

  const profileMap = new Map(data.profiles.map((p) => [p.id, p]))

  // Summary by user
  const byUser = new Map<string, typeof data.sessions>()
  for (const s of data.sessions) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
    byUser.get(s.user_id)!.push(s)
  }
  const summaries = Array.from(byUser.entries())
    .map(([uid, sessions]) => ({
      uid,
      profile: profileMap.get(uid),
      totalMinutes: sessions.filter((s) => s.duration_minutes != null).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
      count: sessions.length,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)

  const flatSessions = [...data.sessions].sort(
    (a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime()
  )

  return (
    <>
      {/* Resumen por operador */}
      <div className="px-5 py-3 bg-sky-500/5 border-b border-sky-500/10 flex flex-wrap gap-x-6 gap-y-1">
        {summaries.map((s) => (
          <span key={s.uid} className="text-sm text-sky-400">
            <span className="font-semibold">{s.profile?.full_name ?? '—'}</span>
            <span className="text-slate-500 ml-1 capitalize text-xs">({s.profile?.role})</span>
            {' · '}
            <span className="font-bold">{formatMinutes(s.totalMinutes)}</span>
            <span className="text-slate-600 text-xs ml-1">{s.count} sesión{s.count !== 1 ? 'es' : ''}</span>
          </span>
        ))}
      </div>

      {/* Detalle sesión por sesión */}
      <table className="w-full">
        <thead>
          <tr>
            <TH>Operador</TH>
            <TH>Fecha</TH>
            <TH>Inicio turno</TH>
            <TH>Fin turno</TH>
            <TH>Duración</TH>
            <TH>Estado</TH>
          </tr>
        </thead>
        <tbody>
          {flatSessions.map((s) => {
            const profile = profileMap.get(s.user_id)
            const loginDate = new Date(s.login_at)
            const logoutDate = s.logout_at ? new Date(s.logout_at) : null
            const isActive = !s.logout_at
            return (
              <tr key={s.id} className={cn('hover:bg-white/[0.02]', isActive && 'bg-[#2DC814]/[0.02]')}>
                <TD>
                  <span className="font-medium text-slate-200">{profile?.full_name ?? '—'}</span>
                  <span className="ml-2 text-xs text-slate-500 capitalize">{profile?.role}</span>
                </TD>
                <TD className="text-slate-400 capitalize">
                  {loginDate.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </TD>
                <TD>
                  <span className="font-mono font-semibold text-[#2DC814]">
                    {loginDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </TD>
                <TD>
                  {logoutDate ? (
                    <span className="font-mono font-semibold text-slate-300">
                      {logoutDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-amber-400 text-xs font-medium">En curso</span>
                  )}
                </TD>
                <TD>
                  <span className={cn('font-bold tabular-nums', s.duration_minutes != null ? 'text-slate-200' : 'text-slate-500')}>
                    {s.duration_minutes != null ? formatMinutes(s.duration_minutes) : '—'}
                  </span>
                </TD>
                <TD>
                  {isActive ? (
                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/20 bg-amber-950/20">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-slate-500 border-white/10">
                      Cerrado
                    </Badge>
                  )}
                </TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

function EmptyReport() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <FileText className="w-8 h-8 text-slate-600 mb-2" />
      <p className="text-sm text-slate-500">Sin datos para el período seleccionado</p>
    </div>
  )
}
