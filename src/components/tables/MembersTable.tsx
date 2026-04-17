'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useMembers, useDeleteMember } from '@/hooks/useMembers'
import { useMonthlyPaymentStatus } from '@/hooks/usePayments'
import { useFilters } from '@/hooks/useFilters'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FilterBar } from '@/components/shared/FilterBar'
import type { FilterDef } from '@/components/shared/FilterBar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  ChevronRight,
} from 'lucide-react'
import type { Member, ReprocannStatus } from '@/types/database'
import { MEMBER_TYPE_LABELS } from '@/lib/constants'
const FILTER_KEYS = ['reprocann', 'member_type', 'cuota']

const MEMBER_FILTERS: FilterDef[] = [
  {
    type: 'select',
    key: 'reprocann',
    label: 'REPROCANN',
    placeholder: 'Todos los estados',
    options: [
      { value: 'activo', label: 'Activo' },
      { value: 'en_tramite', label: 'En trámite' },
      { value: 'vencido', label: 'Vencido' },
      { value: 'cancelado', label: 'Cancelado' },
    ],
  },
  {
    type: 'select',
    key: 'member_type',
    label: 'Tipo de socio',
    placeholder: 'Todos los tipos',
    options: Object.entries(MEMBER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    type: 'select',
    key: 'cuota',
    label: 'Estado cuota',
    placeholder: 'Al día y con deuda',
    options: [
      { value: 'al_dia', label: 'Al día' },
      { value: 'con_deuda', label: 'Con deuda' },
    ],
  },
]

export function MembersTable() {
  const { data: members, isLoading, error } = useMembers()
  const { data: paidMemberIds } = useMonthlyPaymentStatus()
  const deleteMember = useDeleteMember()
  const [search, setSearch] = useState('')
  const { values: filters, set: setFilter, clear: clearFilters, hasActive } = useFilters(FILTER_KEYS)

  const filtered = useMemo(() => {
    if (!members) return []
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        m.dni.includes(search) ||
        m.member_number.toLowerCase().includes(search.toLowerCase())

      const matchesReprocann =
        !filters.reprocann || m.reprocann_status === filters.reprocann

      const matchesType =
        !filters.member_type || m.member_type === filters.member_type

      const matchesCuota = (() => {
        if (!filters.cuota || !paidMemberIds) return true
        const paid = paidMemberIds.has(m.id)
        if (filters.cuota === 'al_dia') return paid
        if (filters.cuota === 'con_deuda') return !paid
        return true
      })()

      return matchesSearch && matchesReprocann && matchesType && matchesCuota
    })
  }, [members, search, filters, paidMemberIds])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Dar de baja a ${name}? Esta acción puede revertirse.`)) return
    await deleteMember.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500">
        <p className="text-sm">Error al cargar socios. Reintentá.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, DNI o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Link href="/socios/nuevo">
          <Button className="bg-green-600 hover:bg-green-700 text-white h-10 gap-2">
            <Plus className="w-4 h-4" />
            Nuevo socio
          </Button>
        </Link>
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={MEMBER_FILTERS}
        values={filters}
        onSet={setFilter}
        onClear={clearFilters}
      />

      {/* Contador */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {filtered.length} de {members?.length ?? 0} socios
          {(hasActive || !!search) && (
            <button
              onClick={() => {
                setSearch('')
                clearFilters()
              }}
              className="ml-2 underline underline-offset-2 hover:text-slate-300"
            >
              Limpiar
            </button>
          )}
        </span>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search || hasActive} />
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05] text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Socio</span>
            <span>N° Socio</span>
            <span>REPROCANN</span>
            <span>Tipo</span>
            <span>Cuota</span>
            <span>Acciones</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                paidThisMonth={paidMemberIds?.has(member.id) ?? false}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member,
  paidThisMonth,
  onDelete,
}: {
  member: Member
  paidThisMonth: boolean
  onDelete: (id: string, name: string) => void
}) {
  const fullName = `${member.first_name} ${member.last_name}`

  return (
    <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:gap-4 lg:items-center">
      <div className="flex items-center justify-between gap-3 lg:contents">
        {/* Nombre + DNI */}
        <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex lg:items-center lg:gap-3">
          <div className="w-9 h-9 bg-[#2DC814]/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#2DC814]">
            {member.first_name.charAt(0)}{member.last_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{fullName}</p>
            <p className="text-xs text-slate-400">
              DNI {member.dni}
              {' · '}
              <span className="font-mono font-semibold text-slate-300">{member.member_number}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 lg:contents">
          {/* N° — desktop only column */}
          <span className="hidden lg:block font-mono text-xs text-slate-400">{member.member_number}</span>

          {/* Estado REPROCANN */}
          <div className="flex items-center gap-2">
            <StatusBadge status={member.reprocann_status as ReprocannStatus} />
            {member.reprocann_expiry && (
              <span className="text-xs text-slate-400 hidden xl:inline">
                vence {new Date(member.reprocann_expiry).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>

          {/* Tipo — hidden on mobile */}
          <div className="hidden lg:block">
            <Badge variant="outline" className="text-xs">
              {MEMBER_TYPE_LABELS[member.member_type] || member.member_type}
            </Badge>
          </div>

          {/* Cuota — hidden on mobile */}
          <div className="hidden lg:block">
            {paidThisMonth ? (
              <Badge variant="outline" className="text-xs text-[#2DC814] border-[#2DC814]/30 bg-[#2DC814]/5">
                Al día
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-700/40 bg-amber-950/20">
                Pendiente
              </Badge>
            )}
          </div>

          {/* Acciones — desktop */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href={`/socios/${member.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-300">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href={`/socios/${member.id}/editar`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-300">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500 hover:text-red-400"
              onClick={() => onDelete(member.id, fullName)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Mobile: arrow */}
          <Link href={`/socios/${member.id}`} className="lg:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-slate-500" />
      </div>
      {hasSearch ? (
        <>
          <p className="text-sm font-medium text-slate-300">Sin resultados</p>
          <p className="text-xs text-slate-500 mt-1">Probá con otro nombre, DNI o filtro.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-300">No hay socios registrados</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Empezá dando de alta al primer socio.</p>
          <Link href="/socios/nuevo">
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Nuevo socio
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
