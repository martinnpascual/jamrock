'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCurrentAccounts } from '@/hooks/useCurrentAccounts'
import { useRole } from '@/hooks/useRole'
import { BalanceBadge } from './BalanceBadge'
import { NewAccountModal } from './NewAccountModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Eye, Users, Building2, ArrowDownUp, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountFilters } from '@/types/current-accounts'

const BALANCE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'negative', label: 'En deuda' },
  { value: 'positive', label: 'A favor' },
  { value: 'zero', label: 'Sin saldo' },
]

const ENTITY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'socio', label: 'Socios' },
  { value: 'proveedor', label: 'Proveedores' },
]

export function AccountsTable() {
  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const { role } = useRole()
  const canCreate = role === 'gerente' || role === 'secretaria'

  const filters: AccountFilters = {
    ...(entityFilter !== 'all' ? { entity_type: entityFilter as 'socio' | 'proveedor' } : {}),
    ...(search ? { search } : {}),
    ...(balanceFilter !== 'all' ? { balance_status: balanceFilter as 'positive' | 'negative' | 'zero' } : {}),
  }

  const { data: accounts = [], isLoading, error } = useCurrentAccounts(filters)
  const totalDeuda = useMemo(
    () => accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0),
    [accounts]
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500">
        <p className="text-sm">Error al cargar cuentas corrientes. Reintentá.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + search + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowNewAccount(true)}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 h-10 flex-shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva cuenta
          </Button>
        )}
      </div>

      {/* Filtros por tipo de entidad */}
      <div className="flex gap-2 flex-wrap items-center">
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setEntityFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              entityFilter === f.value
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="text-slate-300">|</span>
        {BALANCE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setBalanceFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              balanceFilter === f.value
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">
          {accounts.length} cuenta(s)
          {totalDeuda < 0 && (
            <> · <span className="text-red-500 font-medium">
              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Math.abs(totalDeuda))} en deuda
            </span></>
          )}
        </span>
      </div>

      {/* Tabla */}
      {accounts.length === 0 ? (
        <EmptyState hasFilter={!!search || balanceFilter !== 'all' || entityFilter !== 'all'} />
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50/60 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Titular</span>
            <span>Tipo</span>
            <span>N° Cuenta</span>
            <span>Saldo</span>
            <span>Acciones</span>
          </div>
          <div className="divide-y divide-slate-100/80">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 lg:gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors items-center"
              >
                {/* Titular */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    account.entity_type === 'socio'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-sky-50 text-sky-600'
                  )}>
                    {account.entity_type === 'socio'
                      ? <Users className="w-4 h-4" />
                      : <Building2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{account.entity_name ?? '—'}</p>
                    {account.last_movement_at && (
                      <p className="text-xs text-slate-400">
                        Último mov: {new Date(account.last_movement_at).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tipo */}
                <span className={cn(
                  'inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-medium border',
                  account.entity_type === 'socio'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                )}>
                  {account.entity_type === 'socio' ? 'Socio' : 'Proveedor'}
                </span>

                {/* N° Cuenta */}
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg w-fit tracking-wide">
                  {account.account_number}
                </span>

                {/* Saldo */}
                <BalanceBadge balance={account.balance} />

                {/* Acciones */}
                <div className="flex items-center gap-1">
                  <Link href={`/cuentas-corrientes/${account.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewAccountModal
        open={showNewAccount}
        onClose={() => setShowNewAccount(false)}
      />
    </div>
  )
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <ArrowDownUp className="w-6 h-6 text-slate-400" />
      </div>
      {hasFilter ? (
        <>
          <p className="text-sm font-medium text-slate-700">Sin resultados</p>
          <p className="text-xs text-slate-400 mt-1">Probá con otro filtro o búsqueda.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700">Sin cuentas corrientes</p>
          <p className="text-xs text-slate-400 mt-1">Las cuentas se crean automáticamente al registrar pagos, compras o ventas.</p>
        </>
      )}
    </div>
  )
}
