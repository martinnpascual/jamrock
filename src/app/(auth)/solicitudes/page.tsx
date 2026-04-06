'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, CheckCircle, XCircle, ClipboardList, User, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'

type EnrollmentRequest = {
  id: string
  first_name: string
  last_name: string
  dni: string
  email: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  reprocann_status: string | null
  reprocann_number: string | null
  additional_info: string | null
  status: 'pendiente' | 'aprobada' | 'rechazada'
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
}

type StatusFilter = 'todas' | 'pendiente' | 'aprobada' | 'rechazada'

function useEnrollmentRequests() {
  return useQuery({
    queryKey: ['enrollment_requests'],
    queryFn: async (): Promise<EnrollmentRequest[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export default function SolicitudesPage() {
  const { data: requests = [], isLoading, error } = useEnrollmentRequests()
  const { role } = useRole()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pendiente')
  const [search, setSearch] = useState('')

  // Modales
  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null)
  const [approveDialog, setApproveDialog] = useState<{ id: string; name: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvedMember, setApprovedMember] = useState<{ id: string; member_number: string } | null>(null)

  const queryClient = useQueryClient()

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      rejection_reason,
    }: {
      id: string
      action: 'aprobar' | 'rechazar'
      rejection_reason?: string
    }) => {
      const res = await fetch('/api/enrollment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejection_reason }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Error al procesar')
      }
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment_requests'] })
      if (variables.action === 'aprobar' && data.member) {
        setApproveDialog(null)
        setApprovedMember(data.member)
      } else {
        setRejectDialog(null)
        setRejectionReason('')
      }
    },
  })

  const filtered = useMemo(() => {
    let list = requests
    if (statusFilter !== 'todas') {
      list = list.filter((r) => r.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
          r.dni.includes(q)
      )
    }
    return list
  }, [requests, statusFilter, search])

  const pendienteCount = requests.filter((r) => r.status === 'pendiente').length
  const canAct = role === 'gerente' || role === 'secretaria'

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-5xl">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 py-8 text-center">Error al cargar solicitudes.</p>
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Solicitudes de inscripción</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {pendienteCount > 0 ? `${pendienteCount} pendiente(s) de revisión` : 'Sin solicitudes pendientes'}
          </p>
        </div>
        <a
          href="/inscripcion"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-green-600 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver formulario público
        </a>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          {(['pendiente', 'aprobada', 'rechazada', 'todas'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-[#2DC814]/10 text-[#C8FF1C] border-[#2DC814]/30 border'
                  : 'bg-transparent border border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-300">Sin solicitudes</p>
          <p className="text-xs text-slate-400 mt-1">
            {statusFilter === 'pendiente' ? 'No hay solicitudes pendientes por revisar.' : 'No hay solicitudes con ese filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              canAct={canAct}
              onApprove={() => setApproveDialog({ id: req.id, name: `${req.first_name} ${req.last_name}` })}
              onReject={() => setRejectDialog({ id: req.id, name: `${req.first_name} ${req.last_name}` })}
            />
          ))}
        </div>
      )}

      {/* Modal aprobar */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar solicitud</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            ¿Confirmás la aprobación de <strong className="text-slate-200">{approveDialog?.name}</strong>? Se creará automáticamente como socio del club.
          </p>
          {actionMutation.error && (
            <p className="text-sm text-red-500">{(actionMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={actionMutation.isPending}
              onClick={() => approveDialog && actionMutation.mutate({ id: approveDialog.id, action: 'aprobar' })}
            >
              {actionMutation.isPending ? 'Aprobando...' : 'Sí, aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal rechazar */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectionReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Rechazando solicitud de <strong>{rejectDialog?.name}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label>Motivo del rechazo</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Documentación incompleta, DNI duplicado..."
                rows={3}
              />
            </div>
          </div>
          {actionMutation.error && (
            <p className="text-sm text-red-500">{(actionMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason('') }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={actionMutation.isPending}
              onClick={() =>
                rejectDialog &&
                actionMutation.mutate({
                  id: rejectDialog.id,
                  action: 'rechazar',
                  rejection_reason: rejectionReason,
                })
              }
            >
              {actionMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast aprobación exitosa */}
      {approvedMember && (
        <div className="fixed bottom-6 right-6 bg-[#1a1a1a] border border-[#2DC814]/30 rounded-xl shadow-2xl p-4 max-w-sm z-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[#2DC814] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-100">Socio creado exitosamente</p>
              <p className="text-xs text-slate-500 mt-0.5">
                N° de socio: <span className="font-mono font-semibold">{approvedMember.member_number}</span>
              </p>
              <div className="flex gap-2 mt-2">
                <Link
                  href={`/socios/${approvedMember.id}`}
                  className="text-xs text-green-600 hover:underline flex items-center gap-1"
                >
                  <User className="w-3 h-3" />
                  Ver ficha
                </Link>
                <button onClick={() => setApprovedMember(null)} className="text-xs text-slate-400 hover:text-slate-600 ml-2">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RequestCard({
  req,
  canAct,
  onApprove,
  onReject,
}: {
  req: EnrollmentRequest
  canAct: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    pendiente: { label: 'Pendiente', className: 'bg-amber-950/40 text-amber-400 border-amber-800/50' },
    aprobada: { label: 'Aprobada', className: 'bg-[#2DC814]/10 text-[#2DC814] border-[#2DC814]/20' },
    rechazada: { label: 'Rechazada', className: 'bg-red-950/40 text-red-400 border-red-900/50' },
  }

  const config = statusConfig[req.status]

  return (
    <div className={cn(
      'bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-sm',
      req.status === 'aprobada' && 'opacity-60'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Info principal */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-xs font-semibold text-slate-400 flex-shrink-0">
              {req.first_name.charAt(0)}{req.last_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {req.first_name} {req.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                DNI {req.dni}
                {req.email && <span className="hidden sm:inline"> · {req.email}</span>}
              </p>
            </div>
          </div>

          {/* Right: badge + fecha + Más */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="text-xs text-slate-500 hidden sm:block">
              {new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </p>
            <Badge className={cn('text-xs border', config.className)} variant="outline">
              {config.label}
            </Badge>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-400 hover:text-slate-300 underline"
            >
              {expanded ? 'Menos' : 'Más'}
            </button>
          </div>
        </div>

        {/* Acciones — segunda fila en mobile cuando pendiente */}
        {req.status === 'pendiente' && canAct && (
          <div className="flex items-center gap-2 mt-3 sm:mt-2 pl-12">
            <Button
              size="sm"
              className="bg-[#2DC814] hover:bg-[#25a811] text-black font-bold h-8 px-3 gap-1"
              onClick={onApprove}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-900/50 hover:bg-red-950/30 h-8 px-3 gap-1"
              onClick={onReject}
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </Button>
          </div>
        )}
      </div>

      {/* Detalle expandible */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-4 py-3 bg-white/[0.02] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {req.phone && <Detail label="Teléfono" value={req.phone} />}
          {req.birth_date && <Detail label="Nacimiento" value={new Date(req.birth_date).toLocaleDateString('es-AR')} />}
          {req.address && <Detail label="Dirección" value={req.address} />}
          {req.reprocann_status && <Detail label="REPROCANN" value={req.reprocann_status} />}
          {req.reprocann_number && <Detail label="N° REPROCANN" value={req.reprocann_number} />}
          {req.additional_info && (
            <div className="col-span-2 sm:col-span-3">
              <Detail label="Info adicional" value={req.additional_info} />
            </div>
          )}
          {req.status === 'rechazada' && req.rejection_reason && (
            <div className="col-span-2 sm:col-span-3">
              <Detail label="Motivo de rechazo" value={req.rejection_reason} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400 font-medium">{label}</p>
      <p className="text-slate-300 mt-0.5">{value}</p>
    </div>
  )
}
