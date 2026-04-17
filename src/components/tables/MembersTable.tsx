'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useMembers, useDeleteMember } from '@/hooks/useMembers'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { Member, ReprocannStatus } from '@/types/database'
import { MEMBER_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const REPROCANN_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'en_tramite', label: 'En trámite' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'cancelado', label: 'Cancelados' },
]

type SortField = 'name' | 'member_number' | 'reprocann_status'
type SortDir = 'asc' | 'desc'

export function MembersTable() {
  const searchParams = useSearchParams()
  const { data: members, isLoading, error } = useMembers()
  const deleteMember = useDeleteMember()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') ?? 'all'
  )
  const [sortField, setSortField] = useState<SortField>('member_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    if (!members) return []
    const base = members.filter((m) => {
      const matchesSearch =
        !search ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        m.dni.includes(search) ||
        m.member_number.toLowerCase().includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || m.reprocann_status === statusFilter
      return matchesSearch && matchesStatus
    })

    return [...base].sort((a, b) => {
      let valA: string
      let valB: string
      if (sortField === 'name') {
        valA = `${a.first_name} ${a.last_name}`.toLowerCase()
        valB = `${b.first_name} ${b.last_name}`.toLowerCase()
      } else if (sortField === 'member_number') {
        valA = a.member_number
        valB = b.member_number
      } else {
        valA = a.reprocann_status
        valB = b.reprocann_status
      }
      const cmp = valA.localeCompare(valB, 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [members, search, statusFilter, sortField, sortDir])

  async function handleConfirmedDelete() {
    if (!confirmDelete) return
    await deleteMember.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, DNI o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>
        <Link href="/socios/nuevo">
          <Button className="bg-green-600 hover:bg-green-700 text-white h-10 gap-2">
            <Plus className="w-4 h-4" />
            Nuevo socio
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REPROCANN_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === f.value
                ? 'bg-[#2DC814]/10 text-[#C8FF1C] border-[#2DC814]/30'
                : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300'
            )}
          >
            {f.label}
            {f.value !== 'all' && members && (
              <span className="ml-1.5 opacity-60">
                {members.filter((m) => m.reprocann_status === f.value).length}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">
          {filtered.length} de {members?.length ?? 0} socios
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search || statusFilter !== 'all'} />
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05]">
            <SortHeader field="name" current={sortField} dir={sortDir} onSort={toggleSort} label="Socio" />
            <SortHeader field="member_number" current={sortField} dir={sortDir} onSort={toggleSort} label="N° Socio" />
            <SortHeader field="reprocann_status" current={sortField} dir={sortDir} onSort={toggleSort} label="REPROCANN" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Acciones</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onDelete={(id, name) => setConfirmDelete({ id, name })}
              />
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={o => { if (!o && !deleteMember.isPending) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja a {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción puede revertirse. El socio quedará marcado como inactivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMember.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedDelete}
              disabled={deleteMember.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMember.isPending ? 'Dando de baja...' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SortHeader({
  field, current, dir, onSort, label,
}: {
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (f: SortField) => void
  label: string
}) {
  const active = current === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wide hover:text-slate-300 transition-colors"
    >
      {label}
      {active
        ? (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ChevronDown className="w-3 h-3 opacity-30" />}
    </button>
  )
}

function MemberRow({
  member,
  onDelete,
}: {
  member: Member
  onDelete: (id: string, name: string) => void
}) {
  const fullName = `${member.first_name} ${member.last_name}`

  return (
    <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:gap-4 lg:items-center">
      <div className="flex items-center justify-between gap-3 lg:contents">
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
          <div className="flex items-center gap-2">
            <StatusBadge status={member.reprocann_status as ReprocannStatus} />
            {member.reprocann_expiry && (
              <span className="text-xs text-slate-400 hidden xl:inline">
                vence {new Date(member.reprocann_expiry).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>

          <div className="hidden lg:block">
            <Badge variant="outline" className="text-xs">
              {MEMBER_TYPE_LABELS[member.member_type] || member.member_type}
            </Badge>
          </div>

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
