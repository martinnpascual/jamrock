'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Download, Users, Syringe, DollarSign, Package, FileText, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportType = 'dispensas' | 'socios' | 'financiero' | 'stock'
const ARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function useDateRange(from: string, to: string) {
  return {
    from: from + 'T00:00:00',
    to: to + 'T23:59:59',
  }
}

function useReportData(type: ReportType, from: string, to: string) {
  const range = useDateRange(from, to)
  return useQuery({
    queryKey: ['report', type, from, to],
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
  const [type, setType] = useState<ReportType>('dispensas')
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const { data, isLoading } = useReportData(type, from, to)

  const REPORTS: { id: ReportType; label: string; Icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'dispensas', label: 'Dispensas', Icon: Syringe, desc: 'Historial completo de entregas' },
    { id: 'socios', label: 'Socios', Icon: Users, desc: 'Padrón general de miembros' },
    { id: 'financiero', label: 'Financiero', Icon: DollarSign, desc: 'Ventas y pagos del período' },
    { id: 'stock', label: 'Stock medicinal', Icon: Package, desc: 'Estado actual de lotes' },
  ]

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, Icon, desc }) => (
          <button
            key={id}
            onClick={() => setType(id)}
            className={cn(
              'text-left p-4 rounded-xl border-2 transition-all',
              type === id ? 'border-[#2DC814]/50 bg-[#2DC814]/5' : 'border-white/[0.06] bg-[#111111] hover:border-white/[0.12]'
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2',
              type === id ? 'bg-[#2DC814]/15' : 'bg-white/5')}>
              <Icon className={cn('w-4 h-4', type === id ? 'text-[#2DC814]' : 'text-slate-500')} />
            </div>
            <p className={cn('text-sm font-semibold', type === id ? 'text-[#2DC814]' : 'text-slate-200')}>{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Rango de fechas (solo los que lo usan) */}
      {(type === 'dispensas' || type === 'financiero') && (
        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/[0.06]">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Período:</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border border-white/[0.1] bg-[#111111] text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50" />
            <span className="text-xs text-slate-500">hasta</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-white/[0.1] bg-[#111111] text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2DC814]/50" />
          </div>
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
              {type === 'financiero'
                ? `${(data as { sales: unknown[]; payments: unknown[] }).sales.length + (data as { sales: unknown[]; payments: unknown[] }).payments.length} registros`
                : `${(data as unknown[]).length} registros`}
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
  const activos = data.filter(d => d.reprocann_status === 'activo').length
  return (
    <>
      <div className="px-5 py-3 bg-sky-500/5 border-b border-sky-500/10 text-sm text-sky-400">
        {data.length} socios · <strong>{activos} con REPROCANN activo</strong>
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

function EmptyReport() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <FileText className="w-8 h-8 text-slate-600 mb-2" />
      <p className="text-sm text-slate-500">Sin datos para el período seleccionado</p>
    </div>
  )
}
