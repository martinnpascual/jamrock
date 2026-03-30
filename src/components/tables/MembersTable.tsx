'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useMembers, useDeleteMember } from '@/hooks/useMembers'
import { StatusBadge } from '@/components/shared/StatusBadge'
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
import { cn } from '@/lib/utils'

const REPROCANN_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'en_tramite', label: 'En trámite' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'cancelado', label: 'Cancelados' },
]

export function MembersTable() {
  const { data: members, isLoading, error } = useMembers()
  const deleteMember = useDeleteMember()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!members) return []
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        m.dni.includes(search) ||
        m.member_number.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || m.reprocann_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [members, search, statusFilter])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Dar de baja a ${name}? Esta acción puede revertirse.`)) return
    await deleteMember.mutateAsync(id)
  }

  // Loading skeleton
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

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-red-500">
        <p className="text-sm">Error al cargar socios. Reintentá.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda + filtros + CTA */}
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

      {/* Filtros por estado */}
      <div className="flex gap-2 flex-wrap">
        {REPROCANN_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === f.value
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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

      {/* Tabla */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search || statusFilter !== 'all'} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {/* Header de tabla (oculto en mobile, visible en tablet+) */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Socio</span>
            <span>N° Socio</span>
            <span>REPROCANN</span>
            <span>Tipo</span>
            <span>Acciones</span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-slate-100">
            {filtered.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
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
  onDelete,
}: {
  member: Member
  onDelete: (id: string, name: string) => void
}) {
  const fullName = `${member.first_name} ${member.last_name}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 lg:gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors items-center">
      {/* Nombre + DNI */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-600">
          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{fullName}</p>
          <p className="text-xs text-slate-400">DNI {member.dni}</p>
        </div>
      </div>

      {/* N° Socio */}
      <div>
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {member.member_number}
        </span>
      </div>

      {/* Estado REPROCANN */}
      <div className="flex items-center gap-2">
        <StatusBadge status={member.reprocann_status as ReprocannStatus} />
        {member.reprocann_expiry && (
          <span className="text-xs text-slate-400 hidden xl:inline">
            vence {new Date(member.reprocann_expiry).toLocaleDateString('es-AR')}
          </span>
        )}
      </div>

      {/* Tipo */}
      <div>
        <Badge variant="outline" className="text-xs">
          {MEMBER_TYPE_LABELS[member.member_type] || member.member_type}
        </Badge>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <Link href={`/socios/${member.id}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <Link href={`/socios/${member.id}/editar`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
          onClick={() => onDelete(member.id, fullName)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <Link href={`/socios/${member.id}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 lg:hidden">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-slate-400" />
      </div>
      {hasSearch ? (
        <>
          <p className="text-sm font-medium text-slate-700">Sin resultados</p>
          <p className="text-xs text-slate-400 mt-1">Probá con otro nombre, DNI o filtro.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700">No hay socios registrados</p>
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
