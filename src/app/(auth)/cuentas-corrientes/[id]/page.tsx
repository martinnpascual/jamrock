'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAccountDetail } from '@/hooks/useAccountDetail'
import { useRole } from '@/hooks/useRole'
import { BalanceBadge } from '@/components/current-accounts/BalanceBadge'
import { MovementRow } from '@/components/current-accounts/MovementRow'
import { NewMovementModal } from '@/components/current-accounts/NewMovementModal'
import { ReverseMovementModal } from '@/components/current-accounts/ReverseMovementModal'
import { ExportButton } from '@/components/current-accounts/ExportButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CurrentAccountMovement } from '@/types/current-accounts'

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { role } = useRole()

  const [page, setPage] = useState(1)
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [movementToReverse, setMovementToReverse] = useState<CurrentAccountMovement | null>(null)

  const canManage = role === 'gerente' || role === 'secretaria'
  const canReverse = role === 'gerente'

  const { data, isLoading, error } = useAccountDetail(id, { page, limit: 20, from, to })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl">
        <Link href="/cuentas-corrientes">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
        </Link>
        <p className="text-sm text-red-500 py-8 text-center">
          {error ? 'Error al cargar la cuenta.' : 'Cuenta no encontrada.'}
        </p>
      </div>
    )
  }

  const { account, movements, summary, pagination } = data

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cuentas-corrientes">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">{account.entity_name ?? '—'}</h2>
              <Badge variant="outline" className="text-xs capitalize">
                {account.entity_type === 'socio' ? 'Socio' : 'Proveedor'}
              </Badge>
              <span className="font-mono text-xs bg-white/[0.06] px-2 py-0.5 rounded text-slate-400">
                {account.account_number}
              </span>
            </div>
            <BalanceBadge balance={account.balance} className="mt-1" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ExportButton
            accountId={id}
            accountNumber={account.account_number}
            from={from}
            to={to}
          />
          {canManage && (
            <Button
              onClick={() => setShowNewMovement(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 h-9"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Movimiento
            </Button>
          )}
        </div>
      </div>

      {/* KPI resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-950/30 rounded-lg p-4 border border-green-800/40">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-green-400">Total créditos</p>
          </div>
          <p className="text-xl font-bold text-green-400">{ARS.format(summary.total_creditos)}</p>
        </div>
        <div className="bg-red-950/30 rounded-lg p-4 border border-red-800/40">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-red-400">Total débitos</p>
          </div>
          <p className="text-xl font-bold text-red-400">{ARS.format(summary.total_debitos)}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-medium text-slate-400">Movimientos</p>
          </div>
          <p className="text-xl font-bold text-slate-300">{summary.movement_count}</p>
        </div>
      </div>

      {/* Filtro fechas */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Desde</span>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={from ?? ''}
            onChange={(e) => { setFrom(e.target.value || null); setPage(1) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Hasta</span>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={to ?? ''}
            onChange={(e) => { setTo(e.target.value || null); setPage(1) }}
          />
        </div>
        {(from || to) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => { setFrom(null); setTo(null); setPage(1) }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla movimientos */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05] text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>N° / Fecha</span>
          <span>Concepto</span>
          <span className="text-right">Debe</span>
          <span className="text-right">Haber</span>
          <span className="text-right">Saldo</span>
          <span></span>
        </div>

        {movements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400">Sin movimientos en el período seleccionado.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {movements.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                canReverse={canReverse}
                onReverse={setMovementToReverse}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination.total_pages > 1 && (
          <div className={cn(
            'flex items-center justify-between px-4 py-3 border-t border-white/[0.05] bg-white/[0.02]',
          )}>
            <p className="text-xs text-slate-500">
              {pagination.total} movimiento(s) · Página {pagination.page} de {pagination.total_pages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {account.notes && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 text-sm text-yellow-800">
          <strong>Notas:</strong> {account.notes}
        </div>
      )}

      {/* Modals */}
      <NewMovementModal
        open={showNewMovement}
        onClose={() => setShowNewMovement(false)}
        accountId={id}
        entityName={account.entity_name ?? undefined}
      />
      <ReverseMovementModal
        open={!!movementToReverse}
        onClose={() => setMovementToReverse(null)}
        movement={movementToReverse}
        accountId={id}
      />
    </div>
  )
}
